import { useApp } from '../lib/app';
import { Header } from '../components/ui';

// ЧЕРНОВИКИ документов для тестовой версии. Перед публичным запуском их нужно
// подготовить с юристом (152-ФЗ): оператор, реквизиты, цели, сроки, локализация данных в РФ.

export function Policy() {
  const { t } = useApp();
  return (
    <main className="screen legal">
      <Header title={t('policy')} />
      <p className="draft">Черновик для тестовой версии</p>
      <h2>1. Какие данные обрабатываются</h2>
      <p>
        Планы тренировок, результаты упражнений (подходы, повторы, вес), время отдыха, настройки приложения. Из Telegram
        приложение получает только ваш числовой идентификатор, имя и язык интерфейса.
      </p>
      <h2>2. Где хранятся данные</h2>
      <p>
        В тестовой версии все данные хранятся только на вашем устройстве (в памяти Telegram/браузера) и никуда не
        передаются. Если удалить данные Telegram или браузера, история тренировок будет потеряна.
      </p>
      <h2>3. Цели обработки</h2>
      <p>Ведение дневника тренировок и расчёт рекомендаций по рабочим весам.</p>
      <h2>4. Будущие версии</h2>
      <p>
        При появлении синхронизации, подписки и плана питания данные будут храниться на серверах в Российской Федерации.
        Эта политика будет обновлена, и мы попросим ваше согласие заново.
      </p>
    </main>
  );
}

export function Consent() {
  const { t, settings, updateSettings } = useApp();
  return (
    <main className="screen legal">
      <Header title={t('consent')} />
      <p className="draft">Черновик для тестовой версии</p>
      <p>
        Я даю согласие на обработку моих данных о тренировках (планы, результаты, время отдыха) и идентификатора Telegram в
        целях работы приложения: ведения дневника тренировок и расчёта рекомендаций. Согласие действует до его отзыва.
        Отозвать согласие можно в этом разделе.
      </p>
      {settings.consentAt ? (
        <>
          <p className="applied">
            ✓ {t('accepted')}: {new Date(settings.consentAt).toLocaleString()}
          </p>
          <button className="btn btn-ghost btn-block" onClick={() => updateSettings({ consentAt: null })}>
            {settings.lang === 'ru' ? 'Отозвать согласие' : 'Withdraw consent'}
          </button>
        </>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => updateSettings({ consentAt: Date.now() })}>
          {t('accept')}
        </button>
      )}
    </main>
  );
}
