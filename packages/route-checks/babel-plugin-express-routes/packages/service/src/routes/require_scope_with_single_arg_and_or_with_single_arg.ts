export {}
const requireScopes = (content: string) => ({or: (s: string) => {}});
const router = { get: (route: any, permissions: any) => {}}

router.get("/route", requireScopes("permission").or("here"))
