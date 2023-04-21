import UserInfo from "./userInfo";

describe("UserInfo class", () => {
    const userInfoAttributes = {
        id: BigInt(1),
        description: "Test User",
        display_name: "testuser",
        account_created: '2012-02-01T12:05:42Z',
        "contributor-terms": { agreed: true, pd: false },
        img: "https://example.com/avatar.jpg",
        roles: ["mapper"],
        changesets: 10,
        traces: 5,
        blocks: {},
        home: { lat: 52.5167, lon: 13.3833, zoom: 3 },
        languages: ["en", "de"],
        messages: {},
    };

    it("should create an instance of UserInfo", () => {
        const userInfo = new UserInfo(userInfoAttributes);
        expect(userInfo).toBeInstanceOf(UserInfo);
    });

    it("should return JSON representation", () => {
        const userInfo = new UserInfo(userInfoAttributes);
        const json = userInfo.toJSON();
        expect(json).toMatchObject({ ...userInfoAttributes, id: Number(userInfoAttributes.id) });
    });

    it("should return XML JS representation", () => {
        const userInfo = new UserInfo(userInfoAttributes);
        const xmlJs = userInfo.toXmlJs();
        expect(xmlJs._attributes.id).toEqual(Number(userInfoAttributes.id));
        expect(xmlJs._attributes.display_name).toEqual(userInfoAttributes.display_name);
        expect(xmlJs._attributes.account_created).toEqual(userInfoAttributes.account_created);

        expect(xmlJs).toHaveProperty("description", userInfoAttributes.description);
        expect(xmlJs).toHaveProperty("contributor-terms");
        expect(xmlJs).toHaveProperty("img");
        expect(xmlJs).toHaveProperty("roles");
        expect(xmlJs).toHaveProperty("changesets");
        expect(xmlJs).toHaveProperty("traces");
        expect(xmlJs).toHaveProperty("blocks");
        expect(xmlJs).toHaveProperty("home");
        expect(xmlJs).toHaveProperty("languages");
        expect(xmlJs).toHaveProperty("messages");
    });

    const bigIntUserInfoAttributes = {
        ...userInfoAttributes,
        id: BigInt('34252345245645672343454562456')
    };

    it("should not have a problem with bigints", () => {
        const userInfo = new UserInfo(bigIntUserInfoAttributes);
        const xmlJs = userInfo.toXmlJs();
        expect(xmlJs._attributes.id).toEqual('34252345245645672343454562456');
    });
});
