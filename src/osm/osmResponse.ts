import {Element} from './elements.mjs';

const OsmDiff = class {
  constructor(data) {
    const values = {
      'type': String,
      'old_id': BigInt,
      'new_id': BigInt,
      'new_version': BigInt
    };
    // TODO check types
    Object.keys(values).forEach(key => {
      if (key in data) {
        this[key] = data[key].toString();
      }
    });

  }

  toXmlJs() {
    return {'_attributes': Object
      .keys(this)
      .filter(key => ['type', 'uid'].indexOf(key) === -1)
      .reduce((a,v) => ({...a, [v]: this[v]}),{})};
  }
  
};

const changeElement = class extends Element {

  constructor(data) {
    super(data);
    this._action = data.action;
    // Make sure we only support three types
    this.type = ['node', 'way', 'relation'].indexOf(this.type) > -1 ? this.type : undefined;
  }

  tileForPoint() {
    if (this.lat && this.lon) {
      let x = Math.round(((this.lon) + 180.0) * 65535.0 / 360.0);
      let y = Math.round(((this.lat) +  90.0) * 65535.0 / 180.0);

      // these bit-masks are special numbers used in the bit interleaving algorithm.
      // see https://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
      // for the original algorithm and more details.
      x = (x | (x << 8)) &   16711935; // 0x00FF00FF
      x = (x | (x << 4)) &  252645135; // 0x0F0F0F0F
      x = (x | (x << 2)) &  858993459; // 0x33333333
      x = (x | (x << 1)) & 1431655765; // 0x55555555

      y = (y | (y << 8)) &   16711935; // 0x00FF00FF
      y = (y | (y << 4)) &  252645135; // 0x0F0F0F0F
      y = (y | (y << 2)) &  858993459; // 0x33333333
      y = (y | (y << 1)) & 1431655765; // 0x55555555

      return (x << 1) | y;
    } else {
      return undefined;
    }
  }

  applyChange(query, newElements) {

    const QueueQuery = () => {
      // Make a big list of all the queries to run, so we can limit the amount of waiting between the API and the DB
      let queue = {};
      return {
        'add': (priority, sql, values) => {
          queue[priority] = queue[priority] || [];
          queue[priority].push([sql, values]);
          return queue;
        },
        'run': async () => {
          // TODO Run as a transaction, and rollback on error
          const orderedQueue = Object.keys(queue)
            .sort((a,b) => parseInt(a, 10) - parseInt(b, 10));
          await query('BEGIN');
          try {
            for (let i=0; i < orderedQueue.length; i++) {
	      await Promise.all(queue[orderedQueue[i]].map(req =>
		query(req[0], req[1]))
	      );
	      await query('COMMIT');
	    }
	  } catch (e) {
	    await query('ROLLBACK');
	  }
	  return queue;
	}
      };
    };

    const update = async () => {
      const newId = this._action !== 'create' ? this.id : (await query(`SELECT nextval('current_${this.type}s_id_seq') AS newId`)).rows[0].newid;
      const newVersion = await {
        'create': async () => 1,
        'modify': async () => (await query(`SELECT coalesce(MAX(version) + 1, 1) AS version FROM "${this.type}s" WHERE "${this.type}_id" = $1`, [this.id])).rows[0].version,
        'delete': async () => this.version
      }[this._action]();
      const queueQuery = QueueQuery();

      // Remove (make invisible) the existing element
      if (this._action !== 'create') {
        queueQuery.add(1,
          `UPDATE ${this.type}s SET visible = false WHERE "${this.type}_id" = $1 AND "version" = $2`,
          [this.id, this.version]
        );
      }

      if (this.type === 'node') {

        if (this._action !== 'delete') {
          // Add a new node
          queueQuery.add(1,
            `INSERT INTO nodes ("node_id", "latitude", "longitude", "changeset_id", "visible", "timestamp", "tile", "version") VALUES (
                $1, $2, $3, $4, $5, now(), $6, $7)`,
            [newId, Math.round(this.lat * 10000000), Math.round(this.lon * 10000000), this.changeset, true, this.tileForPoint(), newVersion]
          );
        }

        // Update the current nodes table to reflect the change
        queueQuery.add(10,
          `INSERT INTO current_nodes ("id", "latitude", "longitude", "changeset_id", "visible", "timestamp", "tile", "version") VALUES (
                $1, $2, $3, $4, $5, now(), $6, $7) ON CONFLICT (id) DO UPDATE SET
                latitude = $2, longitude = $3, changeset_id = $4, visible = $5, timestamp = now(), tile = $6, version = $7`,
          [newId, Math.round(this.lat * 10000000), Math.round(this.lon * 10000000), this.changeset, this._action !== 'delete', this.tileForPoint(), newVersion]
        );
      } else {
        // Ways and relations

        if (this._action !== 'delete') {
          // Add a new way / relation
          queueQuery.add(1,
            `INSERT INTO ${this.type}s ("${this.type}_id", "changeset_id", "visible", "timestamp", "version") VALUES (
                $1, $2, $3, now(), $4)`,
            [newId, this.changeset, true, newVersion]
          );
        }

        // Update the current element's tabel to reflect the change
        queueQuery.add(10,
          `INSERT INTO current_${this.type}s ("id", "changeset_id", "visible", "timestamp", "version") VALUES (
                $1, $2, $3, now(), $4) ON CONFLICT (id) DO UPDATE SET
                changeset_id = $2, visible = $3, timestamp = now(), version = $4`,
          [newId, this.changeset, this._action !== 'delete', newVersion]
        );

        if (this.type === 'way') {
          // Add nodes
          const nodes = this.nodes.map(node => {
            if (node < 0) {
              // return allCreates.filter(el => el.type === 'node' && el._osmDiff.old_id.toString() === node.toString())[0]._osmDiff.new_id;
              return newElements.get('node' + node.toString())._osmDiff.new_id;
            } else {
              return node;
            }
          });

          // Add the nodes
          nodes.map((node, idx) => queueQuery.add(2, `INSERT INTO way_nodes ("node_id", "way_id", "version", "sequence_id")
            VALUES ($1, $2, $3, $4);`, [node, newId, newVersion, idx+1]));

          // Update the current_way_nodes table
          queueQuery.add(2, 'DELETE FROM current_way_nodes WHERE "way_id" = $1', [newId]);

          // Add them back to current
          queueQuery.add(11, `INSERT INTO current_way_nodes
          (SELECT "way_id", "node_id", "sequence_id" FROM way_nodes WHERE "way_id" = $1 AND "version" = $2)`,
          [newId, newVersion]);

        } else {
          // Add members
          
          // Get new ids if there are any
          const members = this.members.map(member => {
            let ref = member.ref;
            if (member.ref < 0) {
              ref = newElements.get(member.type + member.ref)._osmDiff.new_id;
            }
            return {...member,
              type: member.type.charAt(0).toUpperCase() + member.type.slice(1),
              ref: ref
            };
          });

          // Update the relation_members table
          members.map((member, idx) => queueQuery.add(2, `INSERT INTO relation_members (
            "relation_id", "member_type", "member_id", "member_role", "version", "sequence_id")
            VALUES ($1, $2, $3, $4, $5, $6);`,
          [newId, member.type, member.ref, member.role, newVersion, idx+1]));

          // Update the current_relation_members table
          queueQuery.add(2, 'DELETE FROM current_relation_members WHERE "relation_id" = $1', [newId]);

          // Add them back to current
          queueQuery.add(11, `INSERT INTO current_relation_members
          (SELECT "relation_id", "member_type", "member_id", "member_role", "sequence_id"
           FROM relation_members WHERE "relation_id" = $1 AND "version" = $2)`,
          [newId, newVersion]);
        }
      }

      // The tags
      if (this._action !== 'delete') {
        // Add the tags
        Object.keys(this.tags || {}).map(key => queueQuery.add(3, `
              INSERT INTO ${this.type}_tags ("${this.type}_id", "version", "k", "v") VALUES ($1, $2, $3, $4)`,
        [newId, newVersion, key, this.tags[key]]));

        // Remove the tags from current
        queueQuery.add(2, `DELETE FROM current_${this.type}_tags WHERE "${this.type}_id" = $1`, [newId]);

        // Add them back to current
        queueQuery.add(11, `INSERT INTO current_${this.type}_tags
          (SELECT "${this.type}_id", "k", "v" FROM ${this.type}_tags WHERE "${this.type}_id" = $1 AND "version" = $2)`,
        [newId, newVersion]);
      }

      await queueQuery.run();

      this._osmDiff = new OsmDiff({
        'type': this.type,
        'old_id': this.id,
        'new_id': newId,
        'new_version': newVersion
      });
      return this._osmDiff;
    };

    return new Promise((res, rej) => {
      // verify that we can write to this changeset
      console.log('this', this);
      query('SELECT count(*) FROM changesets WHERE id = $1 AND user_id = $2 AND created_at = closed_at', [this.changeset, this.uid]).then(count => {
        if (count.rows[0].count > 0) {
          update().then(res).catch(e => rej({'db error': e.message, 'stack': e.stack}));
        } else {
          rej({'error':'Invalid Changeset'});
        }
      }).catch(rej);
    });
  }

};

// Helper function to ensure single objects act if they're in an array of one
const arr = (f) => Array.isArray(f) ? f : [f];

const osmChange = async (osmChangeJSON, userId, changeset, query) => {
  console.log('CHANGE JSON', JSON.stringify(osmChangeJSON.osmChange, null, 2));
  const changes = Object.keys(osmChangeJSON.osmChange)
    .filter(key => key !== '_attributes')
    .map(changeType =>
      Object.keys(osmChangeJSON.osmChange[changeType])
        .filter(key => key !== '_attributes')
        .map(elType => arr(osmChangeJSON.osmChange[changeType][elType])
          .map(element => new changeElement(
            {...element._attributes,
              type: elType,
              uid: userId,
              action: changeType,
              changeset: changeset,
              tags: element.tag && arr(element.tag)
                .map(t => ({'k': t._attributes.k, 'v': t._attributes.v}))
                .reduce((a,v) => ({...a, [v.k]: v.v}),{}), //TODO
              nodes: element.nd && arr(element.nd).map(nd => nd._attributes.ref), //MORE TODO
              members: element.member && arr(element.member).map(m => m._attributes) //MOST TODO
            }
          ))
        ).reduce((a,v) => [...a, ...v], [])
    ).reduce((a,v) => [...a, ...v], []);

  const priorities = [
    {'action': 'delete', order: ['relation','way','node']},
    {'action': 'modify', order: ['node','way','relation']},
    {'action': 'create', order: ['node','way','relation']}
  ];

  // Sort it so we do deletes first
  changes.sort((a,b) => (
    priorities.map(k => k.action).indexOf(a._action) -
    priorities.map(k => k.action).indexOf(b._action)
  ) && (
    priorities.map(k => k.type).indexOf(a.type) -
    priorities.map(k => k.type).indexOf(b.type))
  );

  // Now that we have the array sorted, cache the indexes of the creates and make sure the changeset is valid
  const newElements = new Map(changes.filter(e => e._action === 'create' && e.id < 0).map(e => [e.type + e.id.toString(), e]));

  // Make sure all the way_nodes and relation_members are accounted for, if not, throw error and don't attempt to write the changeset to the database
  const checkChanges = changes.filter(e =>
    ['way', 'relation'].indexOf(e.type) > -1).map(e => 
    (e.nodes || e.members || []).map(subEl => {
      const subElId = typeof subEl === 'object' ? subEl.ref.toString() : subEl.toString();
      if (subElId[0] !== '-') {
        return null;
      } else {
        return (subEl.type || 'node') + subElId;
      }
    }).filter(changeId => changeId !== null)
      .map(changeId =>
        [e.type + e.id.toString(), newElements.has(changeId) ? null : changeId]
      ).filter(change => change[1] !== null)
  ).reduce((a,v) => [...a, ...v], []);

  if (checkChanges.length) {
    const parseName = name => [name.replace(/[-\d]/g,''), name.replace(/[a-z]/g,'')];
    throw new Error(`Could not read Changeset. Error is: ${parseName(checkChanges[0][0])[0]} with id  ${parseName(checkChanges[0][0])[1]} refers to missing ${parseName(checkChanges[0][1])[0]}  with id  ${parseName(checkChanges[0][1])[1]}`); 
  }

  // Run them in order (maybe some nodes could be done in parallel?)
  for (const changeIdx in changes) {
    await changes[changeIdx].applyChange(query, newElements);
  }

  return changes.filter(change => change._osmDiff).map(change => change._osmDiff);
};

export default osmChange;
