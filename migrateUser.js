const [userId, displayName, creationDate] = process.argv;
const { InternalPassword } = require('./dist/utils/internalPassword')

function main() {
    const password = new InternalPassword(displayName, {
        id: userId,
        display_name: displayName,
        account_created: creationDate,
    });
    password.isLoaded().then(() => {
        console.log('salt:', password.salt, 'crypt:', password.crypt)
    })
}

main();