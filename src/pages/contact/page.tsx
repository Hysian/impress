import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../../components/feature/Header';
import Footer from '../../components/feature/Footer';
import PageHero from '../../components/feature/PageHero';

const HERO_BG_COLOR = '#1E9188';

export default function ContactPage() {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 可在此接入实际提交逻辑
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <PageHero
        title={t('contactPage.hero.title')}
        subtitle={t('contactPage.hero.subtitle')}
        backgroundColor={HERO_BG_COLOR}
      />

      {/* 主内容：标题+联系方式左右布局，表单区域单独居中 */}
      <section className="py-12 md:py-16 lg:py-24 bg-white">
        <div className="max-w-[1344px] mx-auto px-4 md:px-6">
          {/* 左右布局：联络我们的专家+副标题 | 联系方式 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <div className="flex items-center mb-2">
                <div className="w-[26px] h-[26px] bg-[#8bc34a] mr-3 flex-shrink-0 rounded-full" />
                <h2 className="text-xl md:text-2xl font-bold text-[#1a5f8f]">
                  {t('contactPage.form.title')}
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                {t('contactPage.form.subtitle')}
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="text-[#1a5f8f] mt-1 flex-shrink-0" aria-hidden>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <div>
                  <p className="text-gray-900 font-medium">{t('contactPage.contact.phone')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-[#1a5f8f] mt-1 flex-shrink-0" aria-hidden>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <div>
                  <p className="text-gray-900">{t('contactPage.contact.address')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 表单区域单独一行，相对页面水平居中 */}
          <div className="flex justify-center mt-10 md:mt-14">
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-gray-900 text-sm font-medium mb-1">
                  {t('contactPage.form.nameLabel')} *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('contactPage.form.namePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E9188] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-gray-900 text-sm font-medium mb-1">
                  {t('contactPage.form.emailLabel')} *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('contactPage.form.emailPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E9188] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-gray-900 text-sm font-medium mb-1">
                  {t('contactPage.form.messageLabel')}
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('contactPage.form.messagePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E9188] focus:border-transparent resize-y"
                />
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-md text-white font-medium transition-colors cursor-pointer"
                  style={{ backgroundColor: HERO_BG_COLOR }}
                >
                  {t('contactPage.form.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
