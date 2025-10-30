import React, { useEffect, useState, useMemo } from 'react'; 
import {
  ArrowLeft, Plus, Users, Package, Send, Crown, X, Trash2, Mail, Copy, Check,
  Settings, Search, Edit2, UserPlus, AlertCircle, Dice, //
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { campaignService } from '../services/campaignService';
import { Campaign, CampaignMember, CampaignInventoryItem, CampaignInvitation } from '../types/campaign';
import toast from 'react-hot-toast';

import { LOOT_TABLES, CURRENCY_AMOUNTS, LevelRange, Difficulty, EnemyCount } from '../data/lootTables';
import { Dices } from 'lucide-react'; // Ajoutez cette icône

// Réutilisation des modals d'équipement
import { CustomItemModal } from '../components/modals/CustomItemModal';
import { EquipmentListModal } from '../components/modals/EquipmentListModal';
import { ImageUrlInput } from '../components/ImageUrlInput';

interface GameMasterCampaignPageProps {
  session: any;
  onBack: () => void;
}

const BG_URL = '/background/ddbground.png';

export function GameMasterCampaignPage({ session, onBack }: GameMasterCampaignPageProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await campaignService.getMyCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
      toast.error('Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center">
          <Crown className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-pulse" />
          <p className="text-gray-200">Chargement...</p>
        </div>
      </div>
    );
  }

  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaign={selectedCampaign}
        session={session}
        onBack={() => {
          setSelectedCampaign(null);
          loadCampaigns();
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen py-8 relative"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">
                Gestion des Campagnes
              </h1>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
            >
              <Plus size={20} />
              Nouvelle campagne
            </button>
          </div>
        </div>

        {/* Liste des campagnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{campaigns.map((campaign) => (
  <div
    key={campaign.id}
    className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/80 hover:border-purple-500/50 transition-all duration-200 group relative"
  >
    {/* ✅ Bouton Settings toujours visible (pas de opacity-0) */}
    <button
      onClick={(e) => {
        e.stopPropagation();  // Empêcher l'ouverture de la campagne
        setEditingCampaign(campaign);
      }}
      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
      title="Paramètres de la campagne"
    >
      <Settings size={18} />
    </button>

    {/* Carte cliquable */}
    <div
      onClick={() => setSelectedCampaign(campaign)}
      className="cursor-pointer"
    >
      <div className="mb-3 pr-10">
        {/* ✅ pr-10 pour éviter que le titre chevauche l'icône */}
        <h3 className="text-xl font-bold text-white">
          {campaign.name}
        </h3>
      </div>

      {campaign.description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {campaign.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Créée le {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
        </span>
        <Crown className="w-4 h-4 text-purple-400" />
      </div>
    </div>
  </div>
))}

          {campaigns.length === 0 && (
            <div className="col-span-full bg-gray-900/60 backdrop-blur-sm border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                Aucune campagne créée
              </h3>
              <p className="text-gray-500 mb-6">
                Créez votre première campagne pour commencer à gérer vos joueurs et votre inventaire
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-6 py-3 rounded-lg inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Créer ma première campagne
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadCampaigns();
          }}
        />
      )}

{/* ✅ AJOUTER : Modal d'édition */}
{editingCampaign && (
  <EditCampaignModal
    campaign={editingCampaign}
    onClose={() => setEditingCampaign(null)}
    onUpdated={() => {
      setEditingCampaign(null);
      loadCampaigns();
    }}
  />
)}
      
    </div>
  );
}

// =============================================
// Modal de création de campagne
// =============================================
function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      setCreating(true);
      await campaignService.createCampaign(name.trim(), description.trim());
      toast.success('Campagne créée avec succès !');
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,95vw)] bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Nouvelle campagne</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom de la campagne *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              placeholder="ex: Les Mines de Phandelver"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              rows={4}
              placeholder="Décrivez votre campagne..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={creating}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Création...
              </>
            ) : (
              <>
                <Plus size={18} />
                Créer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


// =============================================
// Modal d'édition de campagne
// =============================================
function EditCampaignModal({ 
  campaign, 
  onClose, 
  onUpdated 
}: { 
  campaign: Campaign; 
  onClose: () => void; 
  onUpdated: () => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || '');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      setUpdating(true);
      await campaignService.updateCampaign(campaign.id, {
        name: name.trim(),
        description: description.trim(),
      });
      toast.success('Campagne mise à jour !');
      onUpdated();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (confirmText !== campaign.name) {
      toast.error('Le nom ne correspond pas');
      return;
    }

    try {
      setDeleting(true);
      await campaignService.deleteCampaign(campaign.id);
      toast.success('Campagne supprimée');
      onUpdated();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(40rem,95vw)] max-w-full bg-gray-900/95 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Modifier la campagne</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de la campagne *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark w-full px-4 py-2 rounded-lg"
                placeholder="ex: Les Mines de Phandelver"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-dark w-full px-4 py-2 rounded-lg"
                rows={4}
                placeholder="Décrivez votre campagne..."
              />
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {/* Boutons Annuler / Sauvegarder en haut */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={updating || deleting}
                className="btn-secondary px-6 py-2 rounded-lg whitespace-nowrap flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating || deleting || !name.trim()}
                className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap flex-1"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Sauvegarder
                  </>
                )}
              </button>
            </div>

            {/* Bouton Supprimer en dessous, pleine largeur */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={updating || deleting}
              className="w-full px-6 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Trash2 size={16} />
              Supprimer la campagne
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10001]" onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteConfirm(false); setConfirmText(''); } }}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,90vw)] max-w-full bg-gray-900/95 border-2 border-red-500/50 rounded-xl p-6">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">⚠️ Confirmer la suppression</h3>
                <p className="text-sm text-gray-400">Cette action est irréversible</p>
              </div>
            </div>

            {/* Avertissements */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4 space-y-2">
              <p className="text-sm text-red-200 font-medium">
                La suppression de "{campaign.name}" entraînera :
              </p>
              <ul className="text-sm text-red-300 space-y-1 ml-4">
                <li>❌ Suppression de tous les joueurs de la campagne</li>
                <li>❌ Suppression de l'inventaire de campagne</li>
                <li>❌ Suppression des loots envoyés</li>
                <li>❌ Perte définitive de toutes les données</li>
              </ul>
            </div>

            {/* Champ de confirmation */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pour confirmer, tapez le nom de la campagne :
              </label>
              <div className="bg-gray-800/40 rounded-lg p-3 mb-2">
                <code className="text-purple-400 font-mono text-sm">{campaign.name}</code>
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input-dark w-full px-4 py-2 rounded-lg"
                placeholder="Tapez le nom exact..."
                autoFocus
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText('');
                }}
                disabled={deleting}
                className="btn-secondary px-6 py-2 rounded-lg whitespace-nowrap flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || confirmText !== campaign.name}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap flex-1"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// =============================================
// Vue détaillée d'une campagne
// =============================================
interface CampaignDetailViewProps {
  campaign: Campaign;
  session: any;
  onBack: () => void;
}

function CampaignDetailView({ campaign, session, onBack }: CampaignDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'inventory' | 'gifts'>('members');
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [inventory, setInventory] = useState<CampaignInventoryItem[]>([]);
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
      loadInvitations();
    } else if (activeTab === 'inventory') {
      loadInventory();
    }
  }, [activeTab]);

  const loadMembers = async () => {
    try {
      const data = await campaignService.getCampaignMembers(campaign.id);
      setMembers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur chargement membres');
    }
  };

const loadInvitations = async () => {
  try {
    // ✅ CORRECTION : Récupérer SEULEMENT les invitations, sans JOIN sur users
    const { data, error } = await supabase
      .from('campaign_invitations')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('invited_at', { ascending: false });

    if (error) throw error;
    setInvitations(data || []);
  } catch (error) {
    console.error(error);
    // ✅ Ne pas afficher d'erreur utilisateur ici, c'est normal
  }
};

  const loadInventory = async () => {
    try {
      const data = await campaignService.getCampaignInventory(campaign.id);
      setInventory(data);
    } catch (error) {
      console.error(error);
      toast.error('Erreur chargement inventaire');
    }
  };

  return (
    <div
      className="min-h-screen py-8 relative"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            Retour aux campagnes
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {campaign.name}
              </h1>
              {campaign.description && (
                <p className="text-gray-400 text-sm mt-1">{campaign.description}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'members'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users size={20} />
              Joueurs ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Package size={20} />
              Inventaire ({inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('gifts')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'gifts'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Send size={20} />
              Envoyer aux joueurs
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'members' && (
          <MembersTab
            campaignId={campaign.id}
            members={members}
            invitations={invitations}
            onReload={() => {
              loadMembers();
              loadInvitations();
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            campaignId={campaign.id}
            inventory={inventory}
            onReload={loadInventory}
          />
        )}

        {activeTab === 'gifts' && (
          <GiftsTab
            campaignId={campaign.id}
            members={members}
            inventory={inventory}
          />
        )}
      </div>
    </div>
  );
}

// =============================================
// Modal de confirmation générique
// =============================================
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirmer',
  confirmButtonText = 'Confirmer',
  onConfirm,
  onCancel,
  danger = false
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10002]" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(28rem,90vw)] bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            danger ? 'bg-red-500/20' : 'bg-blue-500/20'
          }`}>
            <AlertCircle className={`w-6 h-6 ${danger ? 'text-red-400' : 'text-blue-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="btn-secondary px-6 py-2 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 rounded-lg ${
              danger 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'btn-primary'
            }`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Onglet Joueurs
// =============================================
function MembersTab({
  campaignId,
  members,
  invitations,
  onReload
}: {
  campaignId: string;
  members: CampaignMember[];
  invitations: CampaignInvitation[];
  onReload: () => void;
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmDeleteInvite, setConfirmDeleteInvite] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Joueurs de la campagne</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <UserPlus size={18} />
          Inviter un joueur
        </button>
      </div>

{/* Invitations en attente */}
{invitations.filter(inv => inv.status === 'pending').length > 0 && (
  <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-amber-300 mb-3">
      Invitations en attente ({invitations.filter(inv => inv.status === 'pending').length})
    </h3>
    <div className="space-y-2">
      {invitations
        .filter(inv => inv.status === 'pending')
        .map((inv) => (
          <div
            key={inv.id}
            className="bg-gray-900/40 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200">{inv.player_email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Envoyée le {new Date(inv.invited_at).toLocaleDateString('fr-FR')} • ⏳ En attente
              </p>
            </div>
            
<button
  onClick={() => setConfirmDeleteInvite(inv.id)}
  className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
  title="Supprimer l'invitation"
>
  <Trash2 size={16} />
</button>
          </div>
        ))} 
    </div>
  </div>
)}

{/* Liste des membres */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {members.map((member) => (
    <div
      key={member.id}
      className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-white">
            {member.player_name || 'Personnage non défini'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">{member.email}</p>
          <p className="text-xs text-gray-500 mt-2">
            Rejoint le {new Date(member.joined_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
<button
  onClick={() => setConfirmRemoveMember(member.id)}
  className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"
  title="Retirer"
>
  <Trash2 size={16} />
</button>
      </div>
    </div>
  ))}

  {members.length === 0 && (
    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-700">
      Aucun joueur dans la campagne.
      <br />
      <span className="text-sm">Invitez des joueurs pour commencer !</span>
    </div>
  )}
</div>

      {/* ✅ AJOUTER : Modal confirmation suppression invitation */}
      <ConfirmModal
        open={confirmDeleteInvite !== null}
        title="Supprimer l'invitation"
        message="Voulez-vous vraiment supprimer cette invitation ?"
        confirmButtonText="Supprimer"
        onConfirm={async () => {
          if (!confirmDeleteInvite) return;
          try {
            await campaignService.deleteInvitation(confirmDeleteInvite);
            toast.success('Invitation supprimée');
            onReload();
          } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la suppression');
          } finally {
            setConfirmDeleteInvite(null);
          }
        }}
        onCancel={() => setConfirmDeleteInvite(null)}
        danger
      />

      {/* ✅ AJOUTER : Modal confirmation retirer membre */}
      <ConfirmModal
        open={confirmRemoveMember !== null}
        title="Retirer le joueur"
        message="Voulez-vous vraiment retirer ce joueur de la campagne ?"
        confirmButtonText="Retirer"
        onConfirm={async () => {
          if (!confirmRemoveMember) return;
          try {
            await campaignService.removeMember(confirmRemoveMember);
            toast.success('Joueur retiré');
            onReload();
          } catch (error) {
            console.error(error);
            toast.error('Erreur');
          } finally {
            setConfirmRemoveMember(null);
          }
        }}
        onCancel={() => setConfirmRemoveMember(null)}
        danger
      />

      {/* ✅ AJOUTER CETTE MODAL MANQUANTE */}
      {showInviteModal && (
        <InvitePlayerModal
          campaignId={campaignId}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => {
            setShowInviteModal(false);
            onReload();
          }}
        />
      )}
    </div>
  );
}

// =============================================
// Modal d'invitation (SYSTÈME SIMPLIFIÉ)
// =============================================
function InvitePlayerModal({
  campaignId,
  onClose,
  onInvited
}: {
  campaignId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail) {
      toast.error('Email requis');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Email invalide');
      return;
    }

    try {
      setInviting(true);
      await campaignService.invitePlayerByEmail(campaignId, cleanEmail);
      toast.success(`Invitation envoyée à ${cleanEmail}`);
      setEmail('');
      onInvited();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,95vw)] bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Inviter un joueur</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email du joueur
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              placeholder="joueur@exemple.com"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInvite();
              }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Le joueur recevra une invitation et devra sélectionner son personnage pour rejoindre la campagne.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={inviting}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleInvite}
            disabled={inviting || !email.trim()}
            className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {inviting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Envoi...
              </>
            ) : (
              <>
                <Mail size={18} />
                Inviter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ... (gardez tout le code existant jusqu'à la fonction InventoryTab)

// =============================================
// Onglet Inventaire - IMPLÉMENTATION COMPLÈTE
// =============================================
function InventoryTab({ 
  campaignId, 
  inventory, 
  onReload 
}: { 
  campaignId: string; 
  inventory: CampaignInventoryItem[]; 
  onReload: () => void;
}) {
  const [showList, setShowList] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [editingItem, setEditingItem] = useState<CampaignInventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const META_PREFIX = '#meta:';

  const getVisibleDescription = (description: string | null | undefined): string => {
    if (!description) return '';
    return description
      .split('\n')
      .filter(line => !line.trim().startsWith(META_PREFIX))
      .join('\n')
      .trim();
  };

  const parseMeta = (description: string | null | undefined) => {
    if (!description) return null;
    const lines = description.split('\n').map(l => l.trim());
    const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
    if (!metaLine) return null;
    try {
      return JSON.parse(metaLine.slice(META_PREFIX.length));
    } catch {
      return null;
    }
  };

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.description || '').toLowerCase().includes(q)
    );
  }, [inventory, searchQuery]);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer cet objet de l\'inventaire de campagne ?')) return;
    
    try {
      await campaignService.deleteCampaignItem(itemId);
      toast.success('Objet supprimé');
      onReload();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-white">Inventaire de la campagne</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowList(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Liste d'équipement
          </button>
          <button
            onClick={() => setShowCustom(true)}
            className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"
          >
            <Plus size={18} />
            Objet personnalisé
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher dans l'inventaire..."
          className="input-dark flex-1 px-4 py-2 rounded-lg"
        />
      </div>

      {/* Liste des objets */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-700">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            {searchQuery ? 'Aucun résultat' : 'Inventaire vide'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? 'Aucun objet ne correspond à votre recherche'
              : 'Ajoutez des objets pour créer votre inventaire de campagne'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowList(true)}
              className="btn-primary px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Ajouter un objet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const meta = parseMeta(item.description);
            
            return (
              <div
                key={item.id}
                className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/60 transition-colors"
              >
<div className="flex items-start justify-between mb-2">
  {/* ✅ NOUVEAU : Miniature */}
  {meta?.imageUrl && (
    <img
      src={meta.imageUrl}
      alt={item.name}
      className="w-16 h-16 rounded object-cover border border-gray-600/50 mr-3 flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  )}
  
  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{item.name}</h3>
                      
                      {/* ✅ BADGE TYPE */}
                      {meta?.type === 'armor' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/30">
                          Armure
                        </span>
                      )}
                      {meta?.type === 'shield' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30">
                          Bouclier
                        </span>
                      )}
                      {meta?.type === 'weapon' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-500/30">
                          Arme
                        </span>
                      )}
                    </div>

                    {item.quantity > 1 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-300 mt-1 inline-block">
                        x{item.quantity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded"
                      title="Modifier"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* ✅ PROPRIÉTÉS VISUELLES */}
                {meta && (
                  <div className="mb-2 space-y-1 text-xs">
                    {meta.type === 'armor' && meta.armor && (
                      <div className="text-purple-300">
                        🛡️ CA: {meta.armor.label}
                      </div>
                    )}
                    {meta.type === 'shield' && meta.shield && (
                      <div className="text-blue-300">
                        🛡️ Bonus: +{meta.shield.bonus}
                      </div>
                    )}
                    {meta.type === 'weapon' && meta.weapon && (
                      <div className="text-red-300">
                        ⚔️ {meta.weapon.damageDice} {meta.weapon.damageType}
                        {meta.weapon.properties && ` • ${meta.weapon.properties}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Description visible */}
                {getVisibleDescription(item.description) && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                    {getVisibleDescription(item.description)}
                  </p>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
{showList && (
  <EquipmentListModal
    onClose={() => {
      setShowList(false);
      onReload();  // ✅ Recharger UNIQUEMENT à la fermeture
    }}
    onAddItem={async (payload) => {
      try {
        const META_PREFIX = '#meta:';
        const metaLine = `${META_PREFIX}${JSON.stringify(payload.meta)}`;
        const visibleDesc = (payload.description || '').trim();
        const fullDescription = visibleDesc 
          ? `${visibleDesc}\n${metaLine}`
          : metaLine;

        await campaignService.addItemToCampaign(
          campaignId,
          payload.name,
          fullDescription,
          payload.meta.quantity || 1
        );
        
        // ✅ NE PAS RECHARGER ICI, seulement à la fermeture
      } catch (error) {
        console.error(error);
        toast.error('Erreur lors de l\'ajout');
        throw error;
      }
    }}
    allowedKinds={null}
    multiAdd={true}
  />
)}

      {showCustom && (
        <CustomItemModal
          onClose={() => setShowCustom(false)}
          onAdd={async (payload) => {
            try {
              const META_PREFIX = '#meta:';
              const metaLine = `${META_PREFIX}${JSON.stringify(payload.meta)}`;
              const visibleDesc = (payload.description || '').trim();
              const fullDescription = visibleDesc 
                ? `${visibleDesc}\n${metaLine}`
                : metaLine;

              await campaignService.addItemToCampaign(
                campaignId,
                payload.name,
                fullDescription,
                payload.meta.quantity || 1
              );
              
              toast.success('Objet personnalisé ajouté');
              onReload();
            } catch (error) {
              console.error(error);
              toast.error('Erreur lors de l\'ajout');
            } finally {
              setShowCustom(false);
            }
          }}
        />
      )}

      {editingItem && (
        <EditCampaignItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            onReload();
          }}
        />
      )}
    </div>
  );
}

// =============================================
// Modal d'édition d'objet de campagne
// =============================================
// =============================================
// Modal d'édition d'objet de campagne (REMPLACER CE COMPOSANT EN ENTIER)
// =============================================
function EditCampaignItemModal({
  item,
  onClose,
  onSaved
}: {
  item: CampaignInventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const META_PREFIX = '#meta:';

  // États de base
  const [name, setName] = useState(item.name || '');
  const [visibleDescription, setVisibleDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(item.quantity || 1);
  const [saving, setSaving] = useState(false);

  // Méta spécifiques
  const [type, setType] = useState<string | null>(null); // 'armor' | 'weapon' | 'shield' | null
  // armor
  const [armorBase, setArmorBase] = useState<number | null>(null);
  const [armorAddDex, setArmorAddDex] = useState<boolean>(true);
  const [armorDexCap, setArmorDexCap] = useState<number | null>(null);
  // weapon
  const [weaponDamageDice, setWeaponDamageDice] = useState<string>('');
  const [weaponDamageType, setWeaponDamageType] = useState<string>('');
  const [weaponProperties, setWeaponProperties] = useState<string>(''); // fallback libre
  const [weaponRange, setWeaponRange] = useState<string>('');
  const [weaponCategory, setWeaponCategory] = useState<string>('');
  const [weaponBonus, setWeaponBonus] = useState<number | null>(null);
  const [weaponPropTags, setWeaponPropTags] = useState<string[]>([]);
  // shield
  const [shieldBonus, setShieldBonus] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = React.useState<string>('');

  // Listes de choix
  const DAMAGE_TYPES = ['Tranchant', 'Perforant', 'Contondant'] as const;
  const WEAPON_CATEGORIES = [
    'Armes courantes',
    'Armes de guerre',
    'Armes de guerre dotées de la propriété Légère',
    'Armes de guerre présentant la propriété Finesse ou Légère',
  ] as const;
  const RANGES = [
    'Corps à corps',
    'Contact',
    '1,5 m',
    '3 m', '6 m', '9 m', '12 m', '18 m',
    '24 m', '30 m', '36 m', '45 m', '60 m', '90 m', '120 m'
  ] as const;
  const PROPERTY_TAGS = ['Finesse', 'Légère', 'Lancer', 'Polyvalente', 'Deux mains', 'Lourde', 'Allonge', 'Munitions', 'Chargement'] as const;

  // Helpers meta
  const parseMeta = (description: string | null | undefined) => {
    if (!description) return null;
    const lines = description.split('\n').map(l => l.trim());
    const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
    if (!metaLine) return null;
    try {
      return JSON.parse(metaLine.slice(META_PREFIX.length));
    } catch {
      return null;
    }
  };

  const stripMetaFromDescription = (description: string | null | undefined) => {
    if (!description) return '';
    return description
      .split('\n')
      .filter(line => !line.trim().startsWith(META_PREFIX))
      .join('\n')
      .trim();
  };

  // Initialisation (OK: hook à la racine)
  useEffect(() => {
    const vis = stripMetaFromDescription(item.description);
    setVisibleDescription(vis);
    const meta = parseMeta(item.description);

    if (meta) {
      setType(meta.type || null);
      setQuantity(meta.quantity ?? item.quantity ?? 1);

      if (meta.type === 'armor' && meta.armor) {
        setArmorBase(meta.armor.base ?? null);
        setArmorAddDex(meta.armor.addDex ?? true);
        setArmorDexCap(meta.armor.dexCap ?? null);
      }

      if (meta.type === 'weapon' && meta.weapon) {
        setWeaponDamageDice(meta.weapon.damageDice || '1d6');
        setWeaponDamageType(
          (meta.weapon.damageType && (DAMAGE_TYPES as readonly string[]).includes(meta.weapon.damageType as any))
            ? meta.weapon.damageType
            : 'Tranchant'
        );
        const propRaw = meta.weapon.properties || '';
        const initTags = PROPERTY_TAGS.filter(t => propRaw.toLowerCase().includes(t.toLowerCase()));
        setWeaponPropTags(initTags);
        setWeaponProperties(propRaw); // conservation texto
        setWeaponRange(
          (meta.weapon.range && (RANGES as readonly string[]).includes(meta.weapon.range as any))
            ? meta.weapon.range
            : 'Corps à corps'
        );
        setWeaponCategory(
          (meta.weapon.category && (WEAPON_CATEGORIES as readonly string[]).includes(meta.weapon.category as any))
            ? meta.weapon.category
            : 'Armes courantes'
        );
        setWeaponBonus(meta.weapon.weapon_bonus ?? null);
      } else {
        // Si l'utilisateur bascule vers "weapon" ensuite, on mettra des défauts via le hook ci-dessous
      }

      if (meta.type === 'shield' && meta.shield) {
        setShieldBonus(meta.shield.bonus ?? null);
      }

      setImageUrl(meta.imageUrl || '');
    } else {
      setType(null);
      setQuantity(item.quantity || 1);
    }
  }, [item]);

  // Defaults si l'utilisateur change le Type => 'weapon'
  useEffect(() => {
    if (type === 'weapon') {
      setWeaponDamageDice(prev => prev || '1d6');
      setWeaponDamageType(prev => (prev && (DAMAGE_TYPES as readonly string[]).includes(prev as any) ? prev : 'Tranchant'));
      setWeaponRange(prev => (prev && (RANGES as readonly string[]).includes(prev as any) ? prev : 'Corps à corps'));
      setWeaponCategory(prev => (prev && (WEAPON_CATEGORIES as readonly string[]).includes(prev as any) ? prev : 'Armes courantes'));
    }
  }, [type]);

  // Construire meta depuis l'UI
  const buildMeta = () => {
    if (!type) return null;
    const baseMeta: any = {
      type,
      quantity: quantity || 1,
      equipped: false,
      imageUrl: imageUrl.trim() || undefined,
    };

    if (type === 'armor') {
      baseMeta.armor = {
        base: armorBase ?? 0,
        addDex: armorAddDex,
        dexCap: armorDexCap ?? null,
        label: (() => {
          const base = armorBase ?? 0;
          let label = `${base}`;
          if (armorAddDex) label += ' + modificateur de Dex';
          if (armorDexCap != null) label += ` (max ${armorDexCap})`;
          return label;
        })()
      };
    } else if (type === 'weapon') {
      const properties = (weaponPropTags.length ? weaponPropTags.join(', ') : weaponProperties || '').trim();
      baseMeta.weapon = {
        damageDice: weaponDamageDice || '1d6',
        damageType: weaponDamageType || 'Tranchant',
        properties,
        range: weaponRange || 'Corps à corps',
        category: weaponCategory || 'Armes courantes',
        weapon_bonus: weaponBonus
      };
    } else if (type === 'shield') {
      baseMeta.shield = { bonus: shieldBonus ?? 0 };
    }

    return baseMeta;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const metaObj = buildMeta();
      const metaLine = metaObj ? `${META_PREFIX}${JSON.stringify(metaObj)}` : null;
      const cleanVisible = (visibleDescription || '').trim();
      const finalDescription = metaLine
        ? (cleanVisible ? `${cleanVisible}\n${metaLine}` : metaLine)
        : cleanVisible;

      await campaignService.updateCampaignItem(item.id, {
        name: name.trim(),
        description: finalDescription,
        quantity: quantity,
      });

      toast.success('Objet mis à jour');
      onSaved();
    } catch (err) {
      console.error('Erreur save item:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Modifier l'objet</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              placeholder="Nom de l'objet"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quantité</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="input-dark w-full px-4 py-2 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type (méta)</label>
              <select
                value={type || ''}
                onChange={(e) => setType(e.target.value || null)}
                className="input-dark w-full px-4 py-2 rounded-lg"
              >
                <option value="">Aucun (objet générique)</option>
                <option value="armor">Armure</option>
                <option value="shield">Bouclier</option>
                <option value="weapon">Arme</option>
              </select>
            </div>
          </div>

          {/* Armor */}
          {type === 'armor' && (
            <div className="space-y-2 bg-gray-800/30 p-3 rounded">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Base</label>
                  <input type="number" className="input-dark w-full px-2 py-1 rounded" value={armorBase ?? ''} onChange={(e) => setArmorBase(e.target.value ? parseInt(e.target.value) : null)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Add Dex</label>
                  <select className="input-dark w-full px-2 py-1 rounded" value={armorAddDex ? 'true' : 'false'} onChange={(e) => setArmorAddDex(e.target.value === 'true')}>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Dex cap (optionnel)</label>
                  <input type="number" className="input-dark w-full px-2 py-1 rounded" value={armorDexCap ?? ''} onChange={(e) => setArmorDexCap(e.target.value ? parseInt(e.target.value) : null)} />
                </div>
              </div>
            </div>
          )}

          {/* Weapon */}
          {type === 'weapon' && (
            <div className="space-y-2 bg-gray-800/30 p-3 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Dégâts (ex: 1d6)</label>
                  <input className="input-dark w-full px-2 py-1 rounded" value={weaponDamageDice} onChange={(e) => setWeaponDamageDice(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Type de dégâts</label>
                  <select className="input-dark w-full px-2 py-1 rounded" value={weaponDamageType || 'Tranchant'} onChange={(e) => setWeaponDamageType(e.target.value)}>
                    {Array.from(DAMAGE_TYPES).map((dt) => (<option key={dt} value={dt}>{dt}</option>))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-gray-400">Propriétés (cases à cocher)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(PROPERTY_TAGS).map(tag => {
                      const checked = weaponPropTags.includes(tag);
                      return (
                        <label key={tag} className="inline-flex items-center gap-2 text-xs text-gray-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setWeaponPropTags(prev => e.target.checked ? [...prev, tag] : prev.filter(t => t !== tag));
                            }}
                          />
                          <span>{tag}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Finesse/Légère/Lancer/Polyvalente influencent STR/DEX en mêlée.</p>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Portée</label>
                  <select className="input-dark w-full px-2 py-1 rounded" value={weaponRange || 'Corps à corps'} onChange={(e) => setWeaponRange(e.target.value)}>
                    {Array.from(RANGES).map((r) => (<option key={r} value={r}>{r}</option>))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Catégorie</label>
                  <select className="input-dark w-full px-2 py-1 rounded" value={weaponCategory || 'Armes courantes'} onChange={(e) => setWeaponCategory(e.target.value)}>
                    {Array.from(WEAPON_CATEGORIES).map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Bonus de l'arme</label>
                  <input type="number" className="input-dark w-full px-2 py-1 rounded" value={weaponBonus ?? ''} onChange={(e) => setWeaponBonus(e.target.value ? parseInt(e.target.value) : null)} />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-gray-400">Propriétés (libre, optionnel)</label>
                  <input className="input-dark w-full px-2 py-1 rounded" value={weaponProperties} onChange={(e) => setWeaponProperties(e.target.value)} placeholder="Compléments éventuels (si aucune case cochée)" />
                </div>
              </div>
            </div>
          )}

          {/* Shield */}
          {type === 'shield' && (
            <div className="space-y-2 bg-gray-800/30 p-3 rounded">
              <div>
                <label className="text-xs text-gray-400">Bonus</label>
                <input type="number" className="input-dark w-full px-2 py-1 rounded" value={shieldBonus ?? ''} onChange={(e) => setShieldBonus(e.target.value ? parseInt(e.target.value) : null)} />
              </div>
            </div>
          )}

          <div>
            <ImageUrlInput value={imageUrl} onChange={setImageUrl} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description (visible)</label>
            <textarea
              value={visibleDescription}
              onChange={(e) => setVisibleDescription(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              rows={4}
              placeholder="Description que verront les joueurs (les méta sont cachées ici)"
            />
            <p className="text-xs text-gray-500 mt-1">Les propriétés techniques sont sérialisées dans les méta.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}


// =============================================
// Onglet Envois - IMPLÉMENTATION COMPLÈTE
// =============================================
function GiftsTab({ 
  campaignId, 
  members, 
  inventory 
}: { 
  campaignId: string; 
  members: CampaignMember[]; 
  inventory: CampaignInventoryItem[];
}) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showRandomLootModal, setShowRandomLootModal] = useState(false); // ✅ AJOUT
  const [giftType, setGiftType] = useState<'item' | 'currency'>('item');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Envoyer aux joueurs</h2>
        <button
          onClick={() => setShowSendModal(true)}
          className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2"
        >
          <Send size={20} />
          Nouvel envoi
        </button>
      </div>

      {/* Sélecteur de type */}
      <div className="flex items-center gap-4 bg-gray-900/40 p-4 rounded-lg">
        <span className="text-sm font-medium text-gray-300">Type d'envoi :</span>
        <div className="flex gap-2">
          <button
            onClick={() => setGiftType('item')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              giftType === 'item'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Objets
          </button>
          <button
            onClick={() => setGiftType('currency')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              giftType === 'currency'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Argent
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          {giftType === 'item' 
            ? '💎 Envoyez des objets de votre inventaire aux joueurs. Ils pourront choisir de les récupérer individuellement.'
            : '💰 Distribuez de l\'argent (or, argent, cuivre) aux joueurs. Ils pourront se le répartir équitablement ou individuellement.'
          }
        </p>
      </div>

      {/* Placeholder - Historique des envois (à implémenter plus tard) */}
      <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/60 rounded-full flex items-center justify-center">
          <Send className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">
          Historique des envois
        </h3>
        <p className="text-gray-500 text-sm">
          L'historique des objets et argent envoyés apparaîtra ici
        </p>
      </div>

      {/* Modal d'envoi */}
      {showSendModal && (
        <SendGiftModal
          campaignId={campaignId}
          members={members}
          inventory={inventory}
          giftType={giftType}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            toast.success('Envoi effectué aux joueurs !');
          }}
        />
      )}
    </div>
  );
}

// =============================================
// Modal d'envoi de cadeaux
// =============================================


function SendGiftModal({
  campaignId,
  members,
  inventory,
  giftType,
  onClose,
  onSent
}: {
  campaignId: string;
  members: CampaignMember[];
  inventory: CampaignInventoryItem[];
  giftType: 'item' | 'currency';
  onClose: () => void;
  onSent: () => void;
}) {
  // ✅ NOUVEAU : États pour multi-sélection d'objets
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  
  // États pour l'argent
  const [gold, setGold] = useState(0);
  const [silver, setSilver] = useState(0);
  const [copper, setCopper] = useState(0);
  
  const [distributionMode, setDistributionMode] = useState<'individual' | 'shared'>('individual');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectAllRecipients, setSelectAllRecipients] = useState(false);

  const META_PREFIX = '#meta:';
  
  const parseMeta = (description: string | null | undefined) => {
    if (!description) return null;
    const lines = description.split('\n').map(l => l.trim());
    const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
    if (!metaLine) return null;
    try {
      return JSON.parse(metaLine.slice(META_PREFIX.length));
    } catch {
      return null;
    }
  };

  const getVisibleDescription = (description: string | null | undefined): string => {
    if (!description) return '';
    return description
      .split('\n')
      .filter(line => !line.trim().startsWith(META_PREFIX))
      .join('\n')
      .trim();
  };

  const getFullDescription = (item: CampaignInventoryItem) => {
    if (!item) return '';
    const existingMeta = parseMeta(item.description);
    if (!existingMeta) return item.description || '';
    const visibleDesc = getVisibleDescription(item.description);
    const metaLine = `${META_PREFIX}${JSON.stringify(existingMeta)}`;
    return visibleDesc ? `${visibleDesc}\n${metaLine}` : metaLine;
  };

  // ✅ NOUVEAU : Gestion de la sélection d'items
  const toggleItem = (itemId: string) => {
    const newMap = new Map(selectedItems);
    if (newMap.has(itemId)) {
      newMap.delete(itemId);
    } else {
      newMap.set(itemId, 1); // Quantité par défaut: 1
    }
    setSelectedItems(newMap);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const maxQty = item.quantity;
    const clampedQty = Math.max(1, Math.min(quantity, maxQty));
    
    const newMap = new Map(selectedItems);
    newMap.set(itemId, clampedQty);
    setSelectedItems(newMap);
  };

  // Sync selectAllRecipients <-> selectedRecipients
  useEffect(() => {
    if (selectAllRecipients) {
      const allIds = members.map(m => m.user_id || m.player_id || m.id).filter(Boolean) as string[];
      setSelectedRecipients(allIds);
    } else {
      setSelectedRecipients([]);
    }
  }, [selectAllRecipients, members]);

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
    setSelectAllRecipients(false);
  };

  const handleSend = async () => {
    // Validation
    
    if (distributionMode === 'individual' && selectedRecipients.length === 0) {
      toast.error('Sélectionnez au moins un destinataire');
      return;
    }

    if (giftType === 'item') {
      if (selectedItems.size === 0) {
        toast.error('Sélectionnez au moins un objet');
        return;
      }
    } else {
      if (gold <= 0 && silver <= 0 && copper <= 0) {
        toast.error('Entrez un montant');
        return;
      }
    }
   // ✅ DEBUG LOGS
 console.log('📤 DEBUG ENVOI:');
console.log('- Mode:', distributionMode);
console.log('- Recipients sélectionnés:', selectedRecipients);

// ✅ LOG DÉTAILLÉ des members
members.forEach((m, index) => {
  console.log(`  Member ${index + 1}:`, {
    name: m.player_name || m.email,
    user_id: m.user_id,
    player_id: m.player_id,
    email: m.email
  });
});

// ✅ VÉRIF : Est-ce que le destinataire sélectionné est dans la liste ?
const matchingMember = members.find(m => m.user_id === selectedRecipients[0]);
console.log('- Destinataire trouvé dans members ?', matchingMember ? 'OUI' : 'NON');
if (matchingMember) {
  console.log('  → Détails:', {
    name: matchingMember.player_name,
    user_id: matchingMember.user_id,
    email: matchingMember.email
  });
}
    try {
      setSending(true);
 
      
      const recipientIds = distributionMode === 'individual' ? selectedRecipients : null;

      if (giftType === 'item') {
        // ✅ Envoyer chaque objet sélectionné
        for (const [itemId, quantity] of selectedItems.entries()) {
          const item = inventory.find(i => i.id === itemId);
          if (!item) continue;

          await campaignService.sendGift(campaignId, 'item', {
            itemName: item.name,
            itemDescription: getFullDescription(item),
            itemQuantity: quantity,
            gold: 0,
            silver: 0,
            copper: 0,
            distributionMode,
            message: message.trim() || undefined,
            recipientIds: recipientIds || undefined,
            inventoryItemId: item.id,
          });

          // Décrémenter l'inventaire
          const newQuantity = item.quantity - quantity;
          if (newQuantity > 0) {
            await campaignService.updateCampaignItem(item.id, {
              quantity: newQuantity,
            });
          } else {
            await campaignService.deleteCampaignItem(item.id);
          }
        }

        toast.success(`${selectedItems.size} objet${selectedItems.size > 1 ? 's' : ''} envoyé${selectedItems.size > 1 ? 's' : ''} !`);
      } else {
        // Envoi d'argent (inchangé)
        await campaignService.sendGift(campaignId, 'currency', {
          gold,
          silver,
          copper,
          distributionMode,
          message: message.trim() || undefined,
          recipientIds: recipientIds || undefined,
        });
      }

      onSent();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(40rem,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {giftType === 'item' ? '📦 Envoyer des objets' : '💰 Envoyer de l\'argent'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {giftType === 'item' ? (
            <>
              {/* ✅ NOUVEAU : Interface multi-sélection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-300">
                    Objets à envoyer ({selectedItems.size} sélectionné{selectedItems.size > 1 ? 's' : ''})
                  </label>
                  {selectedItems.size > 0 && (
                    <button
                      onClick={() => setSelectedItems(new Map())}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Tout désélectionner
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2 bg-gray-800/30 rounded-lg p-3">
                  {inventory.map((item) => {
                    const isSelected = selectedItems.has(item.id);
                    const selectedQty = selectedItems.get(item.id) || 1;
                    const meta = parseMeta(item.description);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-purple-900/30 border-purple-500/50'
                            : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/40'
                        }`}
                      >
<div className="flex items-start gap-3">
  {/* ✅ NOUVEAU : Miniature de l'item */}
  {meta?.imageUrl && (
    <img
      src={meta.imageUrl}
      alt={item.name}
      className="w-12 h-12 rounded object-cover border border-gray-600/50 flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  )}
  
  {/* Checkbox */}
  <input
    type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item.id)}
                            className="mt-1 w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                          />

                          {/* Info item */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">{item.name}</h4>
                              
                              {/* Badges type */}
                              {meta?.type === 'armor' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/30">
                                  Armure
                                </span>
                              )}
                              {meta?.type === 'shield' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30">
                                  Bouclier
                                </span>
                              )}
                              {meta?.type === 'weapon' && (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-500/30">
                                  Arme
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400">
                              {item.quantity} disponible{item.quantity > 1 ? 's' : ''}
                            </p>

                            {/* Sélecteur de quantité (si sélectionné) */}
                            {isSelected && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs text-gray-400">Quantité:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={selectedQty}
                                  onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className="input-dark w-20 px-2 py-1 text-sm rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs text-gray-500">/ {item.quantity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {inventory.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Aucun objet dans l'inventaire
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Argent (inchangé)
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-yellow-400 mb-2">Or</label>
                  <input
                    type="number"
                    min="0"
                    value={gold}
                    onChange={(e) => setGold(parseInt(e.target.value) || 0)}
                    className="input-dark w-full px-4 py-2 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Argent</label>
                  <input
                    type="number"
                    min="0"
                    value={silver}
                    onChange={(e) => setSilver(parseInt(e.target.value) || 0)}
                    className="input-dark w-full px-4 py-2 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-orange-400 mb-2">Cuivre</label>
                  <input
                    type="number"
                    min="0"
                    value={copper}
                    onChange={(e) => setCopper(parseInt(e.target.value) || 0)}
                    className="input-dark w-full px-4 py-2 rounded-lg text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode de distribution */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mode de distribution</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setDistributionMode('individual');
                  setSelectAllRecipients(false);
                  setSelectedRecipients([]);
                }}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  distributionMode === 'individual'
                    ? 'border-purple-500 bg-purple-900/20 text-white'
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40'
                }`}
              >
                <div className="font-semibold mb-1">Individuel</div>
                <div className="text-xs opacity-80">Envoyer à des destinataires spécifiques</div>
              </button>
              <button
                onClick={() => {
                  setDistributionMode('shared');
                  setSelectAllRecipients(false);
                  setSelectedRecipients([]);
                }}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  distributionMode === 'shared'
                    ? 'border-purple-500 bg-purple-900/20 text-white'
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40'
                }`}
              >
                <div className="font-semibold mb-1">Partagé</div>
                <div className="text-xs opacity-80">Visible à tous</div>
              </button>
            </div>
          </div>

          {/* Sélection des destinataires */}
          {distributionMode === 'individual' && (
            <div className="bg-gray-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-300">Destinataires</div>
                <label className="text-xs text-gray-400 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectAllRecipients}
                    onChange={(e) => setSelectAllRecipients(e.target.checked)}
                  />
                  <span>Tous</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
 {members.map((m) => {
  const uid = m.user_id;  // ✅ TOUJOURS user_id uniquement
  if (!uid) {
    console.warn('⚠️ Member sans user_id:', m);
    return null;  // ✅ Skip si pas de user_id
  }
  
  return (
    <label key={uid} className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={selectedRecipients.includes(uid)}
        onChange={() => toggleRecipient(uid)}
      />
      <span className="ml-1">{m.player_name || m.email}</span>
    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              rows={3}
              placeholder="Ajoutez un message pour les joueurs..."
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={sending}
            className="btn-secondary px-6 py-3 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (giftType === 'item' ? selectedItems.size === 0 : false) || (distributionMode === 'individual' && selectedRecipients.length === 0)}
            className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Envoi...
              </>
            ) : (
              <>
                <Send size={18} />
                {giftType === 'item' && selectedItems.size > 0 
                  ? `Envoyer ${selectedItems.size} objet${selectedItems.size > 1 ? 's' : ''}`
                  : 'Envoyer'
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ); 
}

// =============================================
// Modal de génération de loot aléatoire
// =============================================
function RandomLootModal({
  campaignId,
  members,
  inventory,
  onClose,
  onSent
}: {
  campaignId: string;
  members: CampaignMember[];
  inventory: CampaignInventoryItem[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [levelRange, setLevelRange] = useState<LevelRange>('1-4');
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const [enemyCount, setEnemyCount] = useState<EnemyCount>('1');
  const [distributionMode, setDistributionMode] = useState<'individual' | 'shared'>('shared');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectAllRecipients, setSelectAllRecipients] = useState(false);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewLoot, setPreviewLoot] = useState<{
    copper: number;
    silver: number;
    gold: number;
    equipment: string[];
  } | null>(null);

  useEffect(() => {
    if (selectAllRecipients) {
      const allIds = members.map(m => m.user_id || m.player_id || m.id).filter(Boolean) as string[];
      setSelectedRecipients(allIds);
    } else {
      setSelectedRecipients([]);
    }
  }, [selectAllRecipients, members]);

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
    setSelectAllRecipients(false);
  };

  // Fonction pour obtenir un équipement aléatoire de l'inventaire de campagne
  const getRandomEquipment = (): CampaignInventoryItem | null => {
    if (inventory.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * inventory.length);
    return inventory[randomIndex];
  };

  // Génération du loot selon les probabilités
  const generateLoot = () => {
    const probs = LOOT_TABLES[levelRange][difficulty][enemyCount];
    const currencyRange = CURRENCY_AMOUNTS[levelRange];
    
    // Montant total en cuivre
    const totalCopper = Math.floor(
      Math.random() * (currencyRange.max - currencyRange.min) + currencyRange.min
    );

    // Répartition selon les probabilités
    const roll = Math.random() * 100;
    let copper = 0, silver = 0, gold = 0;
    const equipment: string[] = [];

    if (roll < probs.copper) {
      copper = totalCopper;
    } else if (roll < probs.copper + probs.silver) {
      silver = Math.floor(totalCopper / 10);
    } else if (roll < probs.copper + probs.silver + probs.gold) {
      gold = Math.floor(totalCopper / 100);
    } else {
      // Équipement
      const numItems = levelRange === '1-4' ? 1 : levelRange === '5-10' ? Math.random() < 0.5 ? 1 : 2 : Math.random() < 0.3 ? 1 : 2;
      for (let i = 0; i < numItems; i++) {
        const item = getRandomEquipment();
        if (item) equipment.push(item.name);
      }
      // Un peu d'argent en plus
      const bonusCopper = Math.floor(totalCopper * 0.3);
      silver = Math.floor(bonusCopper / 10);
      copper = bonusCopper % 10;
    }

    return { copper, silver, gold, equipment };
  };

  const handlePreview = () => {
    const loot = generateLoot();
    setPreviewLoot(loot);
  };

  const handleSend = async () => {
    if (distributionMode === 'individual' && selectedRecipients.length === 0) {
      toast.error('Sélectionnez au moins un destinataire');
      return;
    }

    if (!previewLoot) {
      toast.error('Générez d\'abord le loot');
      return;
    }

    try {
      setGenerating(true);
      const recipientIds = distributionMode === 'individual' ? selectedRecipients : null;

      // Envoi de la monnaie
      if (previewLoot.copper > 0 || previewLoot.silver > 0 || previewLoot.gold > 0) {
        await campaignService.sendGift(campaignId, 'currency', {
          gold: previewLoot.gold,
          silver: previewLoot.silver,
          copper: previewLoot.copper,
          distributionMode,
          message: message.trim() || `🎲 Loot aléatoire (Niveau ${levelRange}, ${difficulty}, ${enemyCount} ennemi${enemyCount === '1' ? '' : 's'})`,
          recipientIds: recipientIds || undefined,
        });
      }

      // Envoi des équipements
      for (const equipName of previewLoot.equipment) {
        const item = inventory.find(i => i.name === equipName);
        if (!item) continue;

        const META_PREFIX = '#meta:';
        const getFullDescription = (item: CampaignInventoryItem) => {
          if (!item.description) return '';
          return item.description;
        };

        await campaignService.sendGift(campaignId, 'item', {
          itemName: item.name,
          itemDescription: getFullDescription(item),
          itemQuantity: 1,
          gold: 0,
          silver: 0,
          copper: 0,
          distributionMode,
          message: message.trim() || `🎲 Loot aléatoire (Niveau ${levelRange}, ${difficulty})`,
          recipientIds: recipientIds || undefined,
          inventoryItemId: item.id,
        });

        // Décrémenter l'inventaire
        const newQuantity = item.quantity - 1;
        if (newQuantity > 0) {
          await campaignService.updateCampaignItem(item.id, { quantity: newQuantity });
        } else {
          await campaignService.deleteCampaignItem(item.id);
        }
      }

      toast.success('Loot aléatoire envoyé !');
      onSent();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(40rem,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Dices className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white">🎲 Loot Aléatoire</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Paramètres de la rencontre */}
          <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Paramètres de la rencontre</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Niveau de la rencontre</label>
                <select
                  value={levelRange}
                  onChange={(e) => setLevelRange(e.target.value as LevelRange)}
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                >
                  <option value="1-4">Niveau 1-4</option>
                  <option value="5-10">Niveau 5-10</option>
                  <option value="11-16">Niveau 11-16</option>
                  <option value="17-20">Niveau 17-20</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Difficulté</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                >
                  <option value="facile">Facile</option>
                  <option value="modérée">Modérée</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Nombre d'ennemis</label>
                <select
                  value={enemyCount}
                  onChange={(e) => setEnemyCount(e.target.value as EnemyCount)}
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                >
                  <option value="1">1 ennemi</option>
                  <option value="2-4">2-4 ennemis</option>
                  <option value="5-10">5-10 ennemis</option>
                  <option value="11+">11+ ennemis</option>
                </select>
              </div>
            </div>

            {/* Affichage des probabilités */}
            <div className="bg-gray-900/40 rounded p-3 text-xs text-gray-400">
              <div className="font-semibold text-gray-300 mb-2">Probabilités :</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(() => {
                  const probs = LOOT_TABLES[levelRange][difficulty][enemyCount];
                  return (
                    <>
                      <div>🟤 Cuivre: {probs.copper}%</div>
                      <div>⚪ Argent: {probs.silver}%</div>
                      <div>🟡 Or: {probs.gold}%</div>
                      <div>⚔️ Équipement: {probs.equipment}%</div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bouton de génération */}
            <button
              onClick={handlePreview}
              className="w-full btn-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Dices size={18} />
              Générer le loot
            </button>
          </div>

          {/* Aperçu du loot généré */}
          {previewLoot && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-300 mb-3">🎁 Loot généré :</h4>
              <div className="space-y-2">
                {(previewLoot.gold > 0 || previewLoot.silver > 0 || previewLoot.copper > 0) && (
                  <div className="flex items-center gap-4 text-sm">
                    {previewLoot.gold > 0 && <span className="text-yellow-400">🟡 {previewLoot.gold} or</span>}
                    {previewLoot.silver > 0 && <span className="text-gray-300">⚪ {previewLoot.silver} argent</span>}
                    {previewLoot.copper > 0 && <span className="text-orange-400">🟤 {previewLoot.copper} cuivre</span>}
                  </div>
                )}
                {previewLoot.equipment.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Équipements :</div>
                    {previewLoot.equipment.map((eq, idx) => (
                      <div key={idx} className="text-sm text-purple-300">⚔️ {eq}</div>
                    ))}
                  </div>
                )}
                {previewLoot.copper === 0 && previewLoot.silver === 0 && previewLoot.gold === 0 && previewLoot.equipment.length === 0 && (
                  <div className="text-sm text-gray-500">Aucun loot généré (pas d'équipement disponible dans l'inventaire)</div>
                )}
              </div>
            </div>
          )}

          {/* Mode de distribution */}
          {previewLoot && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mode de distribution</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setDistributionMode('individual');
                      setSelectAllRecipients(false);
                      setSelectedRecipients([]);
                    }}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      distributionMode === 'individual'
                        ? 'border-purple-500 bg-purple-900/20 text-white'
                        : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="font-semibold mb-1">Individuel</div>
                    <div className="text-xs opacity-80">Envoyer à des destinataires spécifiques</div>
                  </button>
                  <button
                    onClick={() => {
                      setDistributionMode('shared');
                      setSelectAllRecipients(false);
                      setSelectedRecipients([]);
                    }}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      distributionMode === 'shared'
                        ? 'border-purple-500 bg-purple-900/20 text-white'
                        : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="font-semibold mb-1">Partagé</div>
                    <div className="text-xs opacity-80">Visible à tous</div>
                  </button>
                </div>
              </div>

              {/* Sélection des destinataires */}
              {distributionMode === 'individual' && (
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-300">Destinataires</div>
                    <label className="text-xs text-gray-400 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectAllRecipients}
                        onChange={(e) => setSelectAllRecipients(e.target.checked)}
                      />
                      <span>Tous</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {members.map((m) => {
                      const uid = m.user_id;
                      if (!uid) return null;
                      
                      return (
                        <label key={uid} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(uid)}
                            onChange={() => toggleRecipient(uid)}
                          />
                          <span className="ml-1">{m.player_name || m.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message (optionnel)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-dark w-full px-4 py-2 rounded-lg"
                  rows={2}
                  placeholder="Ajoutez un message pour les joueurs..."
                />
              </div>
            </>
          )}
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={generating}
            className="btn-secondary px-6 py-3 rounded-lg"
          >
            Annuler
          </button>
          {previewLoot && (
            <button
              onClick={handleSend}
              disabled={generating || (distributionMode === 'individual' && selectedRecipients.length === 0)}
              className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Envoyer le loot
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GameMasterCampaignPage;