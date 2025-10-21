import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, Plus, Users, Package, Send, Crown, X, Trash2, Mail, Copy, Check,
  Settings, Search, Edit2, UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { campaignService } from '../services/campaignService';
import { Campaign, CampaignMember, CampaignInventoryItem, CampaignInvitation } from '../types/campaign';
import toast from 'react-hot-toast';

// Réutilisation des modals d'équipement
import { CustomItemModal } from '../components/modals/CustomItemModal';
import { EquipmentListModal } from '../components/modals/EquipmentListModal';

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
              onClick={() => setSelectedCampaign(campaign)}
              className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 cursor-pointer hover:bg-gray-800/80 hover:border-purple-500/50 transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-white">
                  {campaign.name}
                </h3>
                {campaign.is_active && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                    Active
                  </span>
                )}
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
              <div className="flex items-center gap-4 mt-1">
                <p className="text-xs text-gray-500">
                  Code: <span className="font-mono text-amber-400">{inv.invitation_code}</span>
                </p>
                <p className="text-xs text-gray-500">⏳ En attente</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inv.invitation_code);
                    toast.success('Code copié !');
                  } catch {
                    toast.error('Erreur copie');
                  }
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
                title="Copier le code"
              >
                <Copy size={16} />
              </button>
              
              <button
                onClick={async () => {
                  if (!confirm('Supprimer cette invitation ?')) return;
                  try {
                    await campaignService.deleteInvitation(inv.id);
                    toast.success('Invitation supprimée');
                    onReload();
                  } catch (error) {
                    console.error(error);
                    toast.error('Erreur lors de la suppression');
                  }
                }}
                className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Supprimer l'invitation"
              >
                <Trash2 size={16} />
              </button>
            </div>
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
          onClick={async () => {
            if (!confirm('Retirer ce joueur de la campagne ?')) return;
            try {
              await campaignService.removeMember(member.id);
              toast.success('Joueur retiré');
              onReload();
            } catch (error) {
              console.error(error);
              toast.error('Erreur');
            }
          }}
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
// Modal d'invitation
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
  const [invitationCode, setInvitationCode] = useState<string | null>(null);

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
      const invitation = await campaignService.invitePlayer(campaignId, cleanEmail);
      setInvitationCode(invitation.invitation_code);
      toast.success('Invitation envoyée !');
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('duplicate')) {
        toast.error('Ce joueur a déjà été invité');
      } else {
        toast.error('Erreur lors de l\'invitation');
      }
    } finally {
      setInviting(false);
    }
  };

  if (invitationCode) {
    return (
      <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) { onInvited(); onClose(); } }}>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,95vw)] bg-gray-900/95 border border-gray-700 rounded-xl p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>

            <h3 className="text-xl font-bold text-white">Invitation envoyée !</h3>
            
            <div className="bg-gray-800/60 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-300">
                Partagez ce code d'invitation au joueur :
              </p>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-2xl font-mono font-bold text-purple-400 tracking-wider">
                  {invitationCode}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(invitationCode);
                    toast.success('Code copié dans le presse-papier !');
                  } catch {
                    toast.error('Erreur lors de la copie');
                  }
                }}
                className="btn-primary w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Copy size={18} />
                Copier le code
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Le joueur devra entrer ce code lors de sa connexion pour rejoindre la campagne.
            </p>

            <button
              onClick={() => {
                onInvited();
                onClose();
              }}
              className="btn-secondary w-full px-4 py-2 rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="text-xs text-gray-500 mt-1">
              Un code d'invitation sera généré pour ce joueur
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

  // Filtrer l'inventaire selon la recherche
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
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/60 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{item.name}</h3>
                  {item.quantity > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 mt-1 inline-block">
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

              {item.description && (
                <p className="text-sm text-gray-400 line-clamp-3">
                  {item.description}
                </p>
              )}

              <div className="mt-3 text-xs text-gray-500">
                Ajouté le {new Date(item.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showList && (
        <EquipmentListModal
          onClose={() => setShowList(false)}
          onAddItem={async (payload) => {
            try {
              await campaignService.addItemToCampaign(
                campaignId,
                payload.name,
                payload.description || '',
                payload.meta.quantity || 1
              );
              toast.success('Objet ajouté à l\'inventaire');
              onReload();
            } catch (error) {
              console.error(error);
              toast.error('Erreur lors de l\'ajout');
            } finally {
              setShowList(false);
            }
          }}
          allowedKinds={null}
        />
      )}

      {showCustom && (
        <CustomItemModal
          onClose={() => setShowCustom(false)}
          onAdd={async (payload) => {
            try {
              await campaignService.addItemToCampaign(
                campaignId,
                payload.name,
                payload.description || '',
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
function EditCampaignItemModal({
  item,
  onClose,
  onSaved
}: {
  item: CampaignInventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [quantity, setQuantity] = useState(item.quantity);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      setSaving(true);
      await campaignService.updateCampaignItem(item.id, {
        name: name.trim(),
        description: description.trim(),
        quantity,
      });
      toast.success('Objet modifié');
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,95vw)] bg-gray-900/95 border border-gray-700 rounded-xl p-6">
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
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-dark w-full px-4 py-2 rounded-lg"
              rows={4}
              placeholder="Description de l'objet"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
          >
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
  // États pour les objets
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);

  // États pour l'argent
  const [gold, setGold] = useState(0);
  const [silver, setSilver] = useState(0);
  const [copper, setCopper] = useState(0);

  // États communs
  const [distributionMode, setDistributionMode] = useState<'individual' | 'shared'>('individual');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const selectedItem = inventory.find(i => i.id === selectedItemId);

  // ✅ AJOUT : Fonction pour extraire la description visible (sans les métadonnées)
  const getVisibleDescription = (description: string | null | undefined): string => {
    if (!description) return '';
    return description
      .split('\n')
      .filter(line => !line.trim().startsWith('#meta:'))
      .join('\n')
      .trim();
  };
  
  const handleSend = async () => {
    if (giftType === 'item') {
      if (!selectedItemId) {
        toast.error('Sélectionnez un objet');
        return;
      }
      if (itemQuantity <= 0) {
        toast.error('Quantité invalide');
        return;
      }
      if (selectedItem && itemQuantity > selectedItem.quantity) {
        toast.error(`Quantité disponible : ${selectedItem.quantity}`);
        return;
      }
    } else {
      if (gold <= 0 && silver <= 0 && copper <= 0) {
        toast.error('Entrez un montant');
        return;
      }
    }

    try {
      setSending(true);

      await campaignService.sendGift(campaignId, giftType, {
        itemName: selectedItem?.name,
        itemDescription: selectedItem?.description,
        itemQuantity,
        gold,
        silver,
        copper,
        distributionMode,
        message: message.trim() || undefined,
      });

      // Si c'est un objet, décrémenter la quantité dans l'inventaire
      if (giftType === 'item' && selectedItem) {
        const newQuantity = selectedItem.quantity - itemQuantity;
        if (newQuantity > 0) {
          await campaignService.updateCampaignItem(selectedItem.id, {
            quantity: newQuantity,
          });
        } else {
          await campaignService.deleteCampaignItem(selectedItem.id);
        }
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(36rem,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {giftType === 'item' ? '📦 Envoyer un objet' : '💰 Envoyer de l\'argent'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Sélection de l'objet ou montant */}
          {giftType === 'item' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objet à envoyer</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const item = inventory.find(i => i.id === e.target.value);
                    if (item) setItemQuantity(Math.min(1, item.quantity));
                  }}
                  className="input-dark w-full px-4 py-2 rounded-lg"
                >
                  <option value="">-- Sélectionner un objet --</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (x{item.quantity} disponible{item.quantity > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quantité (max: {selectedItem.quantity})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem.quantity}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.min(parseInt(e.target.value) || 1, selectedItem.quantity))}
                      className="input-dark w-full px-4 py-2 rounded-lg"
                    />
                  </div>

                  {selectedItem.description && (
                    <div className="bg-gray-800/40 rounded-lg p-3">
                      <p className="text-sm text-gray-400">{selectedItem.description}</p>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
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
                onClick={() => setDistributionMode('individual')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  distributionMode === 'individual'
                    ? 'border-purple-500 bg-purple-900/20 text-white'
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40'
                }`}
              >
                <div className="font-semibold mb-1">Individuel</div>
                <div className="text-xs opacity-80">Chaque joueur récupère pour lui</div>
              </button>
              <button
                onClick={() => setDistributionMode('shared')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  distributionMode === 'shared'
                    ? 'border-purple-500 bg-purple-900/20 text-white'
                    : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40'
                }`}
              >
                <div className="font-semibold mb-1">Partagé</div>
                <div className="text-xs opacity-80">À répartir entre les joueurs</div>
              </button>
            </div>
          </div>

          {/* Message optionnel */}
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

          {/* Info sur les destinataires */}
          <div className="bg-gray-800/40 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <Users size={16} />
              <span className="font-medium">Destinataires ({members.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <span
                  key={member.id}
                  className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300"
                >
                  {member.player_name || member.email}
                </span>
              ))}
            </div>
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
            disabled={sending}
            className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send size={18} />
                Envoyer aux joueurs
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameMasterCampaignPage;