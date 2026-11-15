/**
 * A template re-mounts on every navigation inside the app, so each screen
 * fades in instead of snapping. Opacity only (no movement), so it never stacks
 * with the pages' own rise animation. Reduced-motion users get no animation
 * (see globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
