import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageCircle, Edit, Copy, Trash2, Eye, EyeOff, Settings, Inbox, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Funnel } from '../../lib/database.types';

export default function FunnelList() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFunnel, setNewFunnel] = useState({
    name: '',
    profile_name: '',
    slug: '',
  });

  useEffect(() => {
    loadFunnels();
  }, []);

  const loadFunnels = async () => {
    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFunnels(data || []);
    } catch (error) {
      console.error('Error loading funnels:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFunnel = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase
        .from('funnels')
        .insert([{
          name: newFunnel.name,
          profile_name: newFunnel.profile_name,
          slug: newFunnel.slug.toLowerCase().replace(/\s+/g, '-'),
          is_active: false,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating funnel:', error);
        return;
      }

      setFunnels([data, ...funnels]);
      setShowCreateModal(false);
      setNewFunnel({ name: '', profile_name: '', slug: '' });
    } catch (error) {
      console.error('Error creating funnel:', error);
    }
  };

  const toggleActive = async (funnel: Funnel) => {
    try {
      const { error } = await supabase
        .from('funnels')
        .update({ is_active: !funnel.is_active })
        .eq('id', funnel.id);

      if (error) throw error;
      loadFunnels();
    } catch (error) {
      console.error('Error toggling funnel:', error);
    }
  };

  const deleteFunnel = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funil?')) return;

    try {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadFunnels();
    } catch (error) {
      console.error('Error deleting funnel:', error);
    }
  };

  const copyLinkToClipboard = (slug: string) => {
    const link = `${window.location.origin}/chat/${slug}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando funis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Funis</h1>
          <p className="mt-2 text-gray-600">Crie e gerencie seus chat funis</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Funil
        </button>
      </div>

      {funnels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum funil criado</h3>
          <p className="text-gray-600 mb-6">Comece criando seu primeiro chat funil</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Funil
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funnels.map((funnel) => (
            <div
              key={funnel.id}
              className="bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{funnel.name}</h3>
                    <p className="text-sm text-gray-600">@{funnel.profile_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {funnel.is_active ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                        <Eye className="w-3 h-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                        <EyeOff className="w-3 h-3" />
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Link do Chat:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 text-xs text-gray-700 rounded border border-gray-200 truncate">
                      /chat/{funnel.slug}
                    </code>
                    <button
                      onClick={() => copyLinkToClipboard(funnel.slug)}
                      className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-gray-100 rounded transition-colors"
                      title="Copiar link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/funnel/${funnel.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </Link>
                    <Link
                      to={`/admin/funnel/${funnel.id}/settings`}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                      title="Configurações"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => toggleActive(funnel)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                      title={funnel.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {funnel.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteFunnel(funnel.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/admin/funnel/${funnel.id}/conversations`}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                      <Inbox className="w-4 h-4" />
                      Conversas
                    </Link>
                    <Link
                      to={`/admin/funnel/${funnel.id}/analytics`}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors text-sm font-medium"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Métricas
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Novo Funil</h2>
            <form onSubmit={createFunnel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Funil
                </label>
                <input
                  type="text"
                  required
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: Funil de Vendas Produto X"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Perfil (aparece no chat)
                </label>
                <input
                  type="text"
                  required
                  value={newFunnel.profile_name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, profile_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: Suporte Vendas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL do chat)
                </label>
                <input
                  type="text"
                  required
                  value={newFunnel.slug}
                  onChange={(e) => setNewFunnel({ ...newFunnel, slug: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ex: vendas-produto-x"
                  pattern="[a-z0-9-]+"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Apenas letras minúsculas, números e hífens
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewFunnel({ name: '', profile_name: '', slug: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Criar Funil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
