import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Funnel } from '../../lib/database.types';

export default function FunnelSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [facebookCapiToken, setFacebookCapiToken] = useState('');
  const [facebookTestEventCode, setFacebookTestEventCode] = useState('');
  const [utmifyApiToken, setUtmifyApiToken] = useState('');

  useEffect(() => {
    if (id) {
      loadFunnel();
    }
  }, [id]);

  const loadFunnel = async () => {
    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFunnel(data);
        setProfileName(data.profile_name);
        setProfileImageUrl(data.profile_image_url || '');
        setFacebookPixelId(data.facebook_pixel_id || '');
        setFacebookCapiToken(data.facebook_capi_token || '');
        setFacebookTestEventCode(data.facebook_test_event_code || '');
        setUtmifyApiToken(data.utmify_api_token || '');
      }
    } catch (error) {
      console.error('Error loading funnel:', error);
      alert('Erro ao carregar funil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !profileName.trim()) {
      alert('Nome do perfil é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('funnels')
        .update({
          profile_name: profileName,
          profile_image_url: profileImageUrl || null,
          facebook_pixel_id: facebookPixelId || null,
          facebook_capi_token: facebookCapiToken || null,
          facebook_test_event_code: facebookTestEventCode || null,
          utmify_api_token: utmifyApiToken || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      alert('Configurações salvas com sucesso!');
      navigate('/admin');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const generateTrackingScript = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const funnelSlug = funnel?.slug || '';

    return `<script>
(function() {
  const FUNNEL_SLUG = '${funnelSlug}';
  const SUPABASE_URL = '${supabaseUrl}';
  const STORAGE_KEY = 'leadAttribution';
  const TTL_MS = 604800000;

  function generateUUID() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    try {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    } catch {
      return null;
    }
  }

  function buildFbc(fbclid) {
    if (!fbclid) return null;
    const ts = Math.floor(Date.now() / 1000);
    return 'fb.1.' + ts + '.' + fbclid;
  }

  function safeGet(storage, key) { try { return storage.getItem(key); } catch { return null; } }
  function safeSet(storage, key, value) { try { storage.setItem(key, value); return true; } catch { return false; } }
  function safeRemove(storage, key) { try { storage.removeItem(key); } catch {} }

  function clearStorage() {
    safeRemove(localStorage, STORAGE_KEY);
    safeRemove(sessionStorage, STORAGE_KEY);
    try {
      if (window.name && window.name.startsWith(STORAGE_KEY + '=')) window.name = '';
    } catch {}
  }

  function readStorage() {
    const ls = safeGet(localStorage, STORAGE_KEY);
    if (ls) return ls;
    const ss = safeGet(sessionStorage, STORAGE_KEY);
    if (ss) return ss;
    try {
      if (window.name && window.name.startsWith(STORAGE_KEY + '=')) {
        return window.name.slice((STORAGE_KEY + '=').length) || null;
      }
    } catch {}
    return null;
  }

  function writeStorage(value) {
    if (safeSet(localStorage, STORAGE_KEY, value)) return true;
    if (safeSet(sessionStorage, STORAGE_KEY, value)) return true;
    try {
      window.name = STORAGE_KEY + '=' + value;
      return true;
    } catch {}
    return false;
  }

  function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const pick = function(key) {
      const value = params.get(key);
      if (value == null) return null;
      const trimmed = String(value).trim();
      return trimmed === '' ? null : trimmed;
    };
    return {
      utm_source: pick('utm_source'),
      utm_campaign: pick('utm_campaign'),
      utm_medium: pick('utm_medium'),
      utm_content: pick('utm_content'),
      utm_term: pick('utm_term'),
      fbclid: pick('fbclid')
    };
  }

  function loadState() {
    const raw = readStorage();
    if (!raw) return null;
    try {
      const state = JSON.parse(raw);
      const now = Date.now();
      if (state.last_seen && (now - state.last_seen > TTL_MS)) {
        clearStorage();
        return null;
      }
      return state;
    } catch {
      clearStorage();
      return null;
    }
  }

  function saveState(state) {
    writeStorage(JSON.stringify(state));
  }

  function mergeState(prev, incoming) {
    const now = Date.now();
    const base = prev || {
      attribution_id: generateUUID(),
      first_seen: now,
      last_seen: now,
      first_landing_page: window.location.href,
      first_referrer: document.referrer || null,
      last_landing_page: window.location.href,
      last_referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      utm_source: null,
      utm_campaign: null,
      utm_medium: null,
      utm_content: null,
      utm_term: null,
      fbclid: null
    };

    return {
      attribution_id: base.attribution_id,
      first_seen: base.first_seen,
      last_seen: now,
      first_landing_page: base.first_landing_page,
      first_referrer: base.first_referrer,
      last_landing_page: window.location.href,
      last_referrer: document.referrer || base.last_referrer || null,
      user_agent: navigator.userAgent,
      utm_source: incoming.utm_source !== null ? incoming.utm_source : base.utm_source,
      utm_campaign: incoming.utm_campaign !== null ? incoming.utm_campaign : base.utm_campaign,
      utm_medium: incoming.utm_medium !== null ? incoming.utm_medium : base.utm_medium,
      utm_content: incoming.utm_content !== null ? incoming.utm_content : base.utm_content,
      utm_term: incoming.utm_term !== null ? incoming.utm_term : base.utm_term,
      fbclid: incoming.fbclid !== null ? incoming.fbclid : base.fbclid
    };
  }

  function initAttribution() {
    const prev = loadState();
    const incoming = getURLParams();
    const state = mergeState(prev, incoming);
    saveState(state);
    return state;
  }

  async function captureFormSubmit(formData) {
    const state = loadState() || initAttribution();
    const fbp = getCookie('_fbp');
    let fbc = getCookie('_fbc');
    if (!fbc && state.fbclid) {
      fbc = buildFbc(state.fbclid);
    }

    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnel_slug: FUNNEL_SLUG,
          lead_data: formData,
          attribution_id: state.attribution_id,
          utm_source: state.utm_source,
          utm_campaign: state.utm_campaign,
          utm_medium: state.utm_medium,
          utm_content: state.utm_content,
          utm_term: state.utm_term,
          fbclid: state.fbclid,
          fbp: fbp,
          fbc: fbc,
          first_landing_page: state.first_landing_page,
          first_referrer: state.first_referrer,
          last_landing_page: state.last_landing_page,
          last_referrer: state.last_referrer,
          user_agent: state.user_agent
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao capturar lead:', error);
      return null;
    }
  }

  initAttribution();
  window.captureFormSubmit = captureFormSubmit;
})();
</script>`;
  };

  const copyTrackingScript = async () => {
    const script = generateTrackingScript();
    try {
      await navigator.clipboard.writeText(script);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Erro ao copiar script');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Funil não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações do Funil</h1>
            <p className="text-gray-600">{funnel.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Perfil
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 text-2xl font-bold">
                      {profileName.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    placeholder="Cole a URL da imagem de perfil"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Use uma URL de imagem (ex: https://exemplo.com/foto.jpg)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Perfil
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Digite o nome do perfil"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nome aparecerá no cabeçalho do chat
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Pré-visualização</h3>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 text-sm font-bold">
                        {profileName.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{profileName || 'Nome do Perfil'}</h3>
                    <p className="text-xs text-emerald-100">Online</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
                  Assim seu chat aparecerá para os visitantes
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <h3 className="font-medium text-gray-900 mb-3">Facebook Conversions API (Opcional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure o Pixel ID e Token CAPI para enviar eventos de conversão para o Facebook
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={facebookPixelId}
                    onChange={(e) => setFacebookPixelId(e.target.value)}
                    placeholder="123456789012345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Encontre seu Pixel ID no Events Manager do Facebook
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CAPI Access Token
                  </label>
                  <input
                    type="password"
                    value={facebookCapiToken}
                    onChange={(e) => setFacebookCapiToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Token de acesso para Conversions API - gere no Events Manager
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Event Code (Opcional)
                  </label>
                  <input
                    type="text"
                    value={facebookTestEventCode}
                    onChange={(e) => setFacebookTestEventCode(e.target.value)}
                    placeholder="TEST44574"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use este código para testar eventos no Facebook Test Events
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="font-medium text-gray-900 mb-3">Utmify Integration (Opcional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure o token da Utmify para enviar eventos de conversão
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utmify API Token
                </label>
                <input
                  type="password"
                  value={utmifyApiToken}
                  onChange={(e) => setUtmifyApiToken(e.target.value)}
                  placeholder="GScaqKrzCBdQ2IqCrJX5xusXm1lva5iTxR7k"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token de acesso da API Utmify - encontre em sua conta Utmify
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">Script de Tracking</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cole este script na sua página de formulário para capturar UTMs, FBC, FBP e dados de conversão
                  </p>
                </div>
                <button
                  onClick={copyTrackingScript}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                  {scriptCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Script
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                  {generateTrackingScript()}
                </pre>
              </div>

              <div className="mt-3 bg-white rounded-lg border border-blue-200 p-3">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Como usar:</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Copie o script acima</li>
                  <li>Cole no {'<head>'} ou antes do {'</body>'} da sua página de formulário</li>
                  <li>No envio do formulário, chame: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">await window.captureFormSubmit(formData)</code></li>
                  <li>O script retorna <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">chat_url</code> - redirecione o usuário para lá</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !profileName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
