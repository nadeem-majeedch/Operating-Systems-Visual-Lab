/** First focusable element on the page: jumps straight to the main region. */
export function SkipLink({ targetId = 'main-content' }: { readonly targetId?: string }) {
  return (
    <a className="skip-link" href={`#${targetId}`}>
      Skip to main content
    </a>
  );
}
