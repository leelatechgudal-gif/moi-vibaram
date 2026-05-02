import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Phone, 
    Mail, 
    MessageCircle, 
    Globe, 
    MapPin,
    Send,
    Users,
    Briefcase,
    Camera,
    Share2
} from 'lucide-react';

export default function ContactUs() {
    const { t } = useTranslation();

    const socialLinks = [
        { icon: <Camera size={20} />, label: 'Instagram', url: 'https://instagram.com/leelatech' },
        { icon: <Users size={20} />, label: 'Facebook', url: 'https://facebook.com/leelatech' },
        { icon: <Share2 size={20} />, label: 'Twitter', url: 'https://twitter.com/leelatech' },
        { icon: <Briefcase size={20} />, label: 'LinkedIn', url: 'https://linkedin.com/company/leelatech' }
    ];

    return (
        <div className="contact-us-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('contactUs') || 'Contact Us'}</h1>
                    <div className="page-subtitle">We'd love to hear from you!</div>
                </div>
            </div>

            <div className="form-grid">
                {/* Contact Info Card */}
                <div className="card">
                    <h3 style={{ marginBottom: 20, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Globe size={20} /> Get In Touch
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <Phone size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Call Us</div>
                                <a href="tel:+918006880050" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>+91 80068 80050</a>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <Mail size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email Feedback</div>
                                <a href="mailto:anand@leeletech.co.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>anand@leeletech.co.in</a>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <MessageCircle size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>WhatsApp Feedback</div>
                                <a href="https://wa.me/918754734313" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>+91 87547 34313</a>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Office</div>
                                <div style={{ color: 'var(--text)', fontWeight: 600 }}>Leela Tech, Gudalur, Tamil Nadu</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 30 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Follow Us</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {socialLinks.map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-icon"
                                    title={social.label}
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Filler Form Card */}
                <div className="card">
                    <h3 style={{ marginBottom: 20, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Send size={20} /> Send a Message
                    </h3>
                    <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input type="text" className="form-control" placeholder="Your Name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control" placeholder="your@email.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea
                                className="form-control"
                                placeholder="How can we help you?"
                                style={{ minHeight: 120, resize: 'vertical' }}
                            ></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                            Send Message
                        </button>
                    </form>
                </div>
            </div>

            {/* Filler section - FAQ snippet or similar */}
            <div className="card mt-16" style={{ background: 'var(--kolam)' }}>
                <h4 style={{ marginBottom: 12, color: 'var(--maroon)' }}>Why Contact Us?</h4>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Whether you have questions about your Moi transactions, need help with bulk uploads,
                    or want to suggest new features for Moi Vibaram, our team at Leela Tech is here to support you.
                    We usually respond to all inquiries within 24 hours.
                </p>
            </div>
        </div>
    );
}
