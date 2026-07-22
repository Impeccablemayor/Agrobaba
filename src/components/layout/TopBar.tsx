import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function TopBar() {
  const { user } = useAuth();

  return (
    <div id="top">
      <div className="container top-container">
        <span id="user-status">
          <i className={user ? 'fa-solid fa-circle-user' : 'fa-regular fa-circle-user'}></i>{' '}
          Welcome, {user ? <strong>{user.name}</strong> : 'Guest'}
        </span>
        <ul className="top-links">
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Help</Link></li>
          <li><Link to="/services">Services</Link></li>
        </ul>
      </div>
    </div>
  );
}
