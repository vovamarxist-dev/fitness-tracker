import { useApp } from '../lib/app';
import { Header, Chips } from '../components/ui';
import { telegramUserId } from '../lib/telegram';
import { ensureWriteAccess, remindersAvailable } from '../lib/notify';
import type { Lang, ThemeSetting } from '../logic/types';

export function Settings() {
  const { t, settings, updateSettings, push } = useApp();
  return (
    <main className="screen">
      <Header title={t('settings')} />

      <section className="field">
        <span className="field-label">{t('theme')}</span>
        <Chips<ThemeSetting>
          items={[
            { id: 'system', label: t('themeSystem') },
            { id: 'light', label: t('themeLight') },
            { id: 'dark', label: t('themeDark') },
          ]}
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
        />
      </section>

      <section className="field">
        <span className="field-label">{t('language')}</span>
        <Chips<Lang>
          items={[
            { id: 'ru', label: 'Русский' },
            { id: 'en', label: 'English' },
          ]}
          value={settings.lang}
          onChange={(lang) => updateSettings({ lang })}
        />
      </section>

      {remindersAvailable() && (
        <section className="field">
          <label className="toggle">
            <span>{t('botReminders')}</span>
            <input
              type="checkbox"
              checked={settings.botReminders}
              onChange={(e) => {
                updateSettings({ botReminders: e.target.checked });
                if (e.target.checked) void ensureWriteAccess();
              }}
            />
          </label>
          <span className="muted small">{t('botRemindersHint')}</span>
        </section>
      )}

      <section className="field">
        <label className="toggle">
          <span>{t('sound')}</span>
          <input type="checkbox" checked={settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </label>
      </section>

      <ul className="list settings-links">
        <li>
          <button className="card row" onClick={() => push({ name: 'policy' })}>
            {t('policy')} <span className="card-arrow">›</span>
          </button>
        </li>
        <li>
          <button className="card row" onClick={() => push({ name: 'consent' })}>
            {t('consent')}
            <span className="muted small">{settings.consentAt ? `✓ ${t('accepted')}` : ''}</span>
            <span className="card-arrow">›</span>
          </button>
        </li>
        <li>
          <div className="card row disabled">
            {t('support')} <span className="muted small">{t('soon')}</span>
          </div>
        </li>
      </ul>
      {telegramUserId() != null && (
        <p className="muted center small">
          {settings.lang === 'ru' ? 'Ваш Telegram ID' : 'Your Telegram ID'}: <strong className="select">{telegramUserId()}</strong>
        </p>
      )}
      <p className="muted center small">
        {t('version')} {__APP_VERSION__}
      </p>
    </main>
  );
}
