import Link from "next/link";

export default function NotFound() {
  return (
    <main className="message-page">
      <p className="eyebrow">404 / Lost frame</p>
      <h1>This scene does not exist.</h1>
      <Link className="primary-button" href="/">
        Return home
      </Link>
    </main>
  );
}
