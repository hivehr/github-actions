export {};
const requireScopes = (content: string) => "";
const router = { get: (route: string, permissions: string) => {} };

router.get("/route", requireScopes("permission"));
