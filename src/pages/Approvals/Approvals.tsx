import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, ShieldCheck, X } from 'lucide-react';
import { agentApi, type AgentAction, type AgentActionStatus } from '../../services/api/agentApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '../../i18n/useI18n';
import '../BusinessHub.scss';

const TABS: Array<{ id: AgentActionStatus; label: string }> = [
  { id: 'PENDING', label: 'Tasdiq kutilmoqda' },
  { id: 'EXECUTING', label: 'Bajarilmoqda' },
  { id: 'EXECUTED', label: 'Bajarildi' },
  { id: 'CANCELLED', label: 'Rad etildi' },
  { id: 'EXPIRED', label: 'Muddati tugadi' },
  { id: 'FAILED', label: 'Xato' },
];

const TOOL_LABELS: Record<string, string> = {
  create_task: 'Vazifa yaratish', create_reminder: 'Eslatma yaratish', create_meeting: 'Uchrashuv yaratish',
  create_note: 'Qayd saqlash', create_contact: 'Kontakt saqlash', update_contact: 'Kontaktni tahrirlash', delete_contact: 'Kontaktni o‘chirish',
  save_memory: 'AI xotirasiga saqlash', update_memory: 'AI xotirasini tuzatish', delete_memory: 'AI xotirasidan unutish',
  create_finance_transaction: 'Moliyaviy yozuv', send_telegram_message: 'Telegram xabari',
  create_google_calendar_event: 'Calendar hodisasi yaratish', update_google_calendar_event: 'Calendar hodisasini yangilash', delete_google_calendar_event: 'Calendar hodisasini o‘chirish',
};

const formatPreview = (preview: unknown): string => {
  if (!preview || typeof preview !== 'object') return '';
  return Object.entries(preview as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' · ');
};

const Approvals = () => {
  const [tab, setTab] = useState<AgentActionStatus>('PENDING');
  const [items, setItems] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { locale, t } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await agentApi.listActions(tab, 1, 50);
      setItems(result.items);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Tasdiqlashlarni yuklab bo‘lmadi.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, showToast]);

  useEffect(() => { void load(); }, [load]);

  const respond = async (action: AgentAction, confirmed: boolean) => {
    setBusyId(action.id);
    try {
      await agentApi.confirm(action.id, confirmed);
      showToast(confirmed ? t('approvals.confirmed', 'Amal tasdiqlandi') : t('approvals.rejected', 'Amal rad etildi'), 'success');
      await load();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Amalni bajarib bo‘lmadi.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="business-page">
      <header className="business-head">
        <div>
          <span className="business-head__eyebrow">{t('approvals.eyebrow', 'AI AGENT')}</span>
          <h1>{t('approvals.title', 'Tasdiqlashlar')}</h1>
          <p>{t('approvals.description', 'AI agent bajarishni so‘ragan amallarni shu yerda ko‘rib chiqing.')}</p>
        </div>
      </header>

      <div className="business-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={item.id === tab ? 'is-active' : ''}
            role="tab"
            aria-selected={item.id === tab}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="business-card">
        {loading ? (
          <div className="business-empty">{t('common.loading', 'Yuklanmoqda...')}</div>
        ) : items.length ? (
          <div className="business-list">
            {items.map((action) => (
              <div className="business-row" key={action.id}>
                <span className="business-row__icon"><ShieldCheck size={18} /></span>
                <span className="business-row__body">
                  <strong>{TOOL_LABELS[action.toolName] ?? action.toolName}</strong>
                  <span>{formatPreview(action.preview) || 'Tafsilot yo‘q'}</span>
                  <span className="business-row__meta"><Clock size={12} /> {new Date(action.createdAt).toLocaleString(locale)}</span>
                </span>
                {action.status === 'PENDING' && (
                  <>
                    <button
                      className="business-button business-button--ghost"
                      style={{ minHeight: 34, padding: '0 10px' }}
                      disabled={busyId === action.id}
                      onClick={() => void respond(action, false)}
                      aria-label={t('approvals.reject', 'Rad etish')}
                    >
                      <X size={14} />
                    </button>
                    <button
                      className="business-button"
                      style={{ minHeight: 34, padding: '0 10px' }}
                      disabled={busyId === action.id}
                      onClick={() => void respond(action, true)}
                    >
                      <Check size={14} /> {t('approvals.confirm', 'Tasdiqlash')}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="business-empty">{t('approvals.empty', 'Bu bo‘limda hozircha hech narsa yo‘q.')}</div>
        )}
      </section>
    </main>
  );
};

export default Approvals;
