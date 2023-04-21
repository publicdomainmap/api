import { InternalPassword } from './internalPassword'

describe('InternalPassword', () => {
    const userAttributes = {
        id: '1',
        display_name: 'testUser',
        account_created: '2023-03-26T00:00:00Z',
    };

    it('constructor should initialize attributes when userAttributes is provided', () => {
        const internalPassword = new InternalPassword(userAttributes.display_name, userAttributes);
        expect(internalPassword).toBeDefined();
    });

    it('simpleHash should return a consistent hash for the same input', () => {
        const input = 'test input';
        const hash1 = InternalPassword.simpleHash(input);
        const hash2 = InternalPassword.simpleHash(input);
        expect(hash1).toEqual(hash2);
    });

    it('Make sure basicAuth is consistent', () => {
        const internalPassword = new InternalPassword(userAttributes.display_name, userAttributes);
        expect(internalPassword.basicAuth).toBe('Basic dGVzdFVzZXI6cGd4b3M3WmFpY0tMTDJERHNoeDFQVFF6ZDE2T2JPKzFleGVTZEJGNVNxTT0=')
    });


    it('Make sure clearText is consistent', () => {
        const internalPassword = new InternalPassword(userAttributes.display_name, userAttributes);
        expect(internalPassword.clearText).toBe('pgxos7ZaicKLL2DDshx1PTQzd16ObO+1exeSdBF5SqM=')
    });

    it('Make sure crypt is consistent', () => {
        const internalPassword = new InternalPassword(userAttributes.display_name, userAttributes);
        expect(internalPassword.crypt).toBe('1c7002215d58f3d2a9153d80fa048e28')
    });

    it('Make sure salt is consistent', () => {
        const internalPassword = new InternalPassword(userAttributes.display_name, userAttributes);
        expect(internalPassword.salt).toBe('xvjy7u')
    });

});