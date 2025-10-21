import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Users, Package, Send, Crown } from 'lucide-react';
import { campaignService } from '../services/campaignService';
import { Campaign, CampaignMember, CampaignInventoryItem } from '../types/campaign';
import toast from 'react-hot-toast';

interface GameMasterCampaignPageProps {
  session: any;
  onBack: () => void;
}

export function GameMasterCampaignPage({ session, onBack }: GameMasterCampaignPageProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
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
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">
                Gestion des Campagnes
              </h1>
            </div>

            <button
              onClick={async () => {
                const name = prompt('Nom de la nouvelle campagne :');
                if (!name) return;

                try {
                  await campaignService.createCampaign(name);
                  toast.success('Campagne créée !');
                  loadCampaigns();
                } catch (error) {
                  console.error(error);
                  toast.error('Erreur lors de la création');
                }
              }}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
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
              className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-6 cursor-pointer hover:bg-gray-800 hover:border-purple-500/50 transition-all duration-200"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                {campaign.name}
              </h3>
              {campaign.description && (
                <p className="text-sm text-gray-400 mb-4">
                  {campaign.description}
                </p>
              )}
              <div className="text-xs text-gray-500">
                Créée le {new Date(campaign.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Aucune campagne créée. Cliquez sur "Nouvelle campagne" pour commencer !
            </div>
          )}
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

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers();
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
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
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
            <Crown className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">
              {campaign.name}
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users size={20} />
              Joueurs
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Package size={20} />
              Inventaire
            </button>
            <button
              onClick={() => setActiveTab('gifts')}
              className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
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
            onReload={loadMembers}
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

// Tabs à créer dans la suite...
function MembersTab({ campaignId, members, onReload }: any) {
  return <div className="text-white">Onglet Joueurs (à implémenter)</div>;
}

function InventoryTab({ campaignId, inventory, onReload }: any) {
  return <div className="text-white">Onglet Inventaire (à implémenter)</div>;
}

function GiftsTab({ campaignId, members, inventory }: any) {
  return <div className="text-white">Onglet Envois (à implémenter)</div>;
}