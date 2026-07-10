import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-outline-variant/20 pt-16 pb-8 px-margin-mobile md:px-margin-desktop w-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-1">
          <div className="flex items-center mb-6">
            <img src="/logo-landing.png" alt="Melodia Logo" className="w-44 h-auto object-contain" />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">The premium cloud music experience for discerning listeners.</p>
        </div>
        <div>
          <h4 className="font-label-md text-label-md font-semibold text-on-surface mb-4 uppercase tracking-wider">Product</h4>
          <ul className="space-y-3">
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Features</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Desktop App</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Mobile App</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-label-md text-label-md font-semibold text-on-surface mb-4 uppercase tracking-wider">Company</h4>
          <ul className="space-y-3">
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">About Us</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Careers</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Press</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-label-md text-label-md font-semibold text-on-surface mb-4 uppercase tracking-wider">Legal</h4>
          <ul className="space-y-3">
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a></li>
            <li><a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Cookie Policy</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-outline-variant/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-label-sm text-label-sm text-on-surface-variant">© 2026 Melodia Audio Inc. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined text-[20px]">public</span>
          </a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined text-[20px]">share</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
