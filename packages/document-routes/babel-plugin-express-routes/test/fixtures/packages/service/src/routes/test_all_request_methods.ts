export {};
const requireScopes = (content: string) => "";
const router = {
    get: (route: string, permissions: string) => {},
    head: (route: string, permissions: string) => {},
    post: (route: string, permissions: string) => {},
    put: (route: string, permissions: string) => {},
    delete: (route: string, permissions: string) => {},
    connect: (route: string, permissions: string) => {},
    options: (route: string, permissions: string) => {},
    trace: (route: string, permissions: string) => {},
    patch: (route: string, permissions: string) => {}
};

router.get("/route", requireScopes("permission"));
router.head("/route", requireScopes("permission"));
router.post("/route", requireScopes("permission"));
router.put("/route", requireScopes("permission"));
router.delete("/route", requireScopes("permission"));
router.connect("/route", requireScopes("permission"));
router.options("/route", requireScopes("permission"));
router.trace("/route", requireScopes("permission"));
router.patch("/route", requireScopes("permission"));