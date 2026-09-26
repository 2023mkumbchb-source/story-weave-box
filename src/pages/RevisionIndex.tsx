// Legacy route kept for old bookmarks. The current revision planner is the canonical revision page.
// Keep this route as a lightweight re-export so production builds do not depend on removed revision modules.
export { default } from "./RevisionPlanner";
