import { createHash } from "crypto";
import { QueryResult } from "pg";
import query from "../db";
import { UserData } from "../middleware/requireAuth";

interface userAttributes {
    id?: string;
    displayName?: string;
    accountCreated?: string;
};

/**
 * InternalPassword class helps manage user authentication by generating and
 * verifying passwords based on user attributes.
 */
export class InternalPassword {
    private _attributes?: userAttributes;
    private _salt?: string;
    private _crypt?: string;
    private _loaded: boolean = false;
    private _awaiting: Promise<userAttributes>;

    /**
     * Initializes a new instance of the InternalPassword class.
     * @param displayName - The user's display name.
     * @param userAttributes - Optional user attributes.
     */
    constructor(
        displayName: string,
        userAttributes?: UserData["_attributes"]
    ) {
        if (userAttributes) {
            this._attributes = {
                id: userAttributes.id,
                displayName: userAttributes.display_name,
                accountCreated: userAttributes.account_created,
            };
        }
        this._awaiting = this.fetchAttributes(displayName);
        this._awaiting
            .then(() => (this._loaded = true))
            .catch((e) => console.error("Error loading user data", e));
    }

    /**
     * Returns a promise that resolves to true if the user data is loaded.
     */
    async isLoaded(): Promise<userAttributes> {
        if (this._loaded && this._attributes) {
            return this._attributes;
        } else {
            return this._awaiting;
        }
    }

    /**
     * Fetches user attributes from the database based on the display name.
     * @param displayName - The user's display name.
     */
    private async fetchAttributes(
        displayName: string
    ): Promise<{
        id?: string;
        displayName?: string;
        accountCreated?: string;
    }> {
        if (!this._attributes) {
            const userInfo: QueryResult<{
                id: number;
                creation_time: string;
                pass_salt: string;
                pass_crypt: string;
            }> | null = await query(
                `SELECT id, to_char(creation_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creation_time, pass_salt, pass_crypt FROM users WHERE display_name = $1;`,
                [displayName]
            );
            if (userInfo && userInfo.rowCount > 0) {
                this._salt = userInfo.rows[0].pass_salt;
                this._crypt = userInfo.rows[0].pass_crypt;
                this._attributes = {
                    id: userInfo.rows[0].id.toString(),
                    displayName: displayName,
                    accountCreated: userInfo.rows[0].creation_time,
                };
                return this._attributes;
            } else {
                throw new Error("Cannot load user");
            }
        } else {
            return this._attributes;
        }
    }

    /**
     * Returns the salt used for hashing the password.
     */
    get salt(): string {
        if (this._salt) return this._salt;
        if (!this._attributes) throw new Error("Cannot get password");
        const salt = InternalPassword.simpleHash(
            Object.values(this._attributes).join(this._attributes.id)
        );
        return salt;
    }

    /**
     * Returns the hashed password.
     */
    get crypt(): string {
        if (this._crypt) return this._crypt;
        return createHash("md5")
            .update([this.salt, this.clearText].join(""))
            .digest("hex");
    }


    /**
     * Returns the clear text password.
     */
    get clearText() {
        if (!this._attributes) throw new Error('Cannot get password');
        const base = Object.values(this._attributes).join(',');
        const md5Interations = (parseInt(this._attributes.id as string) % 9) + 1;
        let pw = createHash('sha256').update(base).digest('base64');
        for (let i = 0; i < md5Interations; i++) {
            pw = createHash('sha256').update(pw).digest('base64');
        }
        return pw;
    }

    /**
     * Returns the Basic Authentication header value for the user.
     * @throws {Error} If the user attributes are not available.
     */
    get basicAuth(): string {
        if (!this._attributes) throw new Error("Cannot get password");
        const userInfo = [this._attributes?.displayName, this.clearText];
        const basicAuthKey = Buffer.from(userInfo.join(":"), "binary").toString("base64");
        return `Basic ${basicAuthKey}`;
    }

    /**
     * Generates a simple hash from the given string.
     * @param str - The input string to hash.
     * @returns {string} A simple hash of the input string.
     */
    static simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash &= hash; // Convert to 32bit integer
        }
        return new Uint32Array([hash])[0].toString(36);
    }

}