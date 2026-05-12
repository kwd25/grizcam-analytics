// Generic JSX anchor example. Adapt `currentPath` to the portal's route helper.
<a href="/analytics" class={currentPath?.startsWith("/analytics") ? "active" : ""}>
  Analytics
</a>;

// If the portal already has a NavLink-style component, use that instead.
<NavLink href="/analytics" active={currentPath?.startsWith("/analytics")}>
  Analytics
</NavLink>;
