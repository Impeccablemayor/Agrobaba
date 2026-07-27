import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer id="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-seedling" style={{ color: 'var(--primary)' }}></i>
              Agro<span style={{ color: 'var(--accent)' }}>baba</span>
            </div>
            <p>Connecting verified farmers, buyers, agro-dealers and service providers across Nigeria and Africa. Every deal escrow protected.</p>
            <div className="footer-socials">
              <a href="https://facebook.com/agrobaba" title="Facebook"><i className="fa-brands fa-facebook-f"></i></a>
              <a href="https://twitter.com/agrobaba" title="Twitter"><i className="fa-brands fa-twitter"></i></a>
              <a href="https://instagram.com/agrobaba" title="Instagram"><i className="fa-brands fa-instagram"></i></a>
              <a href="https://wa.me/2347041512742" title="WhatsApp"><i className="fa-brands fa-whatsapp"></i></a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/"><i className="fa-solid fa-chevron-right"></i> Home</Link></li>
              <li><Link to="/shop"><i className="fa-solid fa-chevron-right"></i> Shop</Link></li>
              <li><Link to="/demands"><i className="fa-solid fa-chevron-right"></i> Demand Board</Link></li>
              <li><Link to="/about"><i className="fa-solid fa-chevron-right"></i> About Us</Link></li>
              <li><Link to="/services"><i className="fa-solid fa-chevron-right"></i> Services</Link></li>
              <li><Link to="/contact"><i className="fa-solid fa-chevron-right"></i> Contact</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Categories</h4>
            <ul>
              <li><Link to="/shop?tab=produce"><i className="fa-solid fa-chevron-right"></i> Fresh Produce</Link></li>
              <li><Link to="/shop?tab=inputs"><i className="fa-solid fa-chevron-right"></i> Agro Inputs</Link></li>
              <li><Link to="/shop?tab=equipment"><i className="fa-solid fa-chevron-right"></i> Farm Equipment</Link></li>
              <li><Link to="/shop?tab=services"><i className="fa-solid fa-chevron-right"></i> Agro Services</Link></li>
              <li><Link to="/demands"><i className="fa-solid fa-chevron-right"></i> Demand Board</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#"><i className="fa-solid fa-location-dot"></i> Adegbayi, Ibadan, Oyo State</a></li>
              <li><a href="mailto:Rsdofollybeefarms@gmail.com"><i className="fa-solid fa-envelope"></i> Rsdofollybeefarms@gmail.com</a></li>
              <li><a href="tel:+2347041512742"><i className="fa-solid fa-phone"></i> +2347041512742</a></li>
              <li><a href="#"><i className="fa-brands fa-whatsapp"></i> WhatsApp Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Agrobaba. All rights reserved.</p>
          <p>Built for African farmers 🌱</p>
        </div>
      </div>
    </footer>
  );
}
