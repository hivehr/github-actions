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
