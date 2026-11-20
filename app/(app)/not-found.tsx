/** 404 inside the owner layout (header, main and footer come from app/(app)/layout.tsx). */
export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>There is nothing at this address. It may have been renamed or removed.</p>
      <p>
        <a href="/">Go to Home</a> or <a href="/search">search all entries</a>.
      </p>
    </>
  );
}
