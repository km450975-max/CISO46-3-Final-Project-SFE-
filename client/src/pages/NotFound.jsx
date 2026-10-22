import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-center">
      <div className="card">
        <h1>Page not found</h1>
        <p>That address is not part of Banana Math.</p>
        <Link className="button button-primary" to="/">Back home</Link>
      </div>
    </div>
  );
}
