import { Link } from 'react-router-dom';
import { useCategories } from '../../hooks/queries/useCategories';
import { getSectionIdByCode } from '../../lib/categories';

export function Footer() {
  const { data: categories = [] } = useCategories();

  const sectionHref = (code: string) => {
    const id = getSectionIdByCode(categories, code);
    return id ? `/shop?categoryId=${encodeURIComponent(id)}` : '/shop';
  };

  return (
    <footer id="footer" className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand-logo">
              <span className="brand-leaf"><i className="fa-solid fa-seedling"></i></span>
              <span className="brand-text">Agro<span className="brand-accent">baba</span></span>
            </Link>
            <p className="footer-tagline">
              Connecting verified farmers, buyers, agro-dealers, and service providers across Nigeria. Direct agricultural commerce, transparent pricing, and secure trade.
            </p>
            <div className="footer-trust-pill">
              <i className="fa-solid fa-shield-halved"></i> Escrow Protected Transactions
            </div>
            <div className="footer-social-links">
              <a href="https://facebook.com/agrobaba" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a href="https://twitter.com/agrobaba" target="_blank" rel="noopener noreferrer" title="Twitter / X" aria-label="Twitter">
                <i className="fa-brands fa-x-twitter"></i>
              </a>
              <a href="https://instagram.com/agrobaba" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="https://wa.me/2347041512742" target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="WhatsApp">
                <i className="fa-brands fa-whatsapp"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>Marketplace</h4>
            <ul>
              <li><Link to="/"><i className="fa-solid fa-angle-right"></i> Home</Link></li>
              <li><Link to="/shop"><i className="fa-solid fa-angle-right"></i> Browse Market</Link></li>
              <li><Link to="/demands"><i className="fa-solid fa-angle-right"></i> Buyer Demand Board</Link></li>
              <li><Link to="/services"><i className="fa-solid fa-angle-right"></i> Agricultural Services</Link></li>
              <li><Link to="/register"><i className="fa-solid fa-angle-right"></i> Start Selling</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="footer-col">
            <h4>Categories</h4>
            <ul>
              <li><Link to={sectionHref('produce')}><i className="fa-solid fa-angle-right"></i> Fresh Produce</Link></li>
              <li><Link to={sectionHref('inputs')}><i className="fa-solid fa-angle-right"></i> Agro Inputs & Seeds</Link></li>
              <li><Link to={sectionHref('livestock')}><i className="fa-solid fa-angle-right"></i> Livestock & Poultry</Link></li>
              <li><Link to={sectionHref('equipment')}><i className="fa-solid fa-angle-right"></i> Farm Machinery & Tools</Link></li>
              <li><Link to={sectionHref('services')}><i className="fa-solid fa-angle-right"></i> Agro Services</Link></li>
            </ul>
          </div>

          {/* Contact & Location */}
          <div className="footer-col">
            <h4>Contact & Office</h4>
            <ul className="footer-contact-list">
              <li>
                <i className="fa-solid fa-location-dot"></i>
                <span>Adegbayi, Ibadan, Oyo State, Nigeria</span>
              </li>
              <li>
                <i className="fa-solid fa-envelope"></i>
                <a href="mailto:Rsdofollybeefarms@gmail.com">Rsdofollybeefarms@gmail.com</a>
              </li>
              <li>
                <i className="fa-solid fa-phone"></i>
                <a href="tel:+2347041512742">+234 704 151 2742</a>
              </li>
              <li>
                <i className="fa-brands fa-whatsapp"></i>
                <a href="https://wa.me/2347041512742" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer bottom copyright and credits */}
        <div className="footer-bottom-bar">
          <p>&copy; {new Date().getFullYear()} AgroBaba. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/about">About Us</Link>
            <span className="dot-divider">&middot;</span>
            <Link to="/contact">Help & Support</Link>
            <span className="dot-divider">&middot;</span>
            <span>Empowering Nigerian Agriculture 🌱</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
