export {};
const requireScopes = (content: string) => ({
    or: (s: string) => (
        { or: (s: string) => (
            { or: (s: string) => (
                { or: (s: string) => (
                    {})
                })
            })
        })
});
const router = { get: (route: any, permissions: any) => {} };

router.get(
    "/route",
    requireScopes("permission")
        .or("here")
        .or("over here 2")
        .or("get over here"));
