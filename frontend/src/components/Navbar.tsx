import Link from 'next/link';
import styles from './Navbar.module.css';
import { Gamepad2, UserCircle } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.logo}>
          <Gamepad2 size={28} className={styles.logoIcon} />
          <span className="gradient-text">100PercentGuides</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/guides" className={styles.navLink}>Guides</Link>
          <Link href="/community" className={styles.navLink}>Community</Link>
          <button className={styles.profileBtn}>
            <UserCircle size={20} />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
