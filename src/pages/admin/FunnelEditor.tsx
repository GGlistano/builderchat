import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { supabase } from '../../lib/supabase';
import type { Funnel, FunnelBlock, BlockType } from '../../lib/database.types';
import BlockNode from '../../components/editor/BlockNode';
import BlockSidebar from '../../components/editor/BlockSidebar';
import BlockProperties from '../../components/editor/BlockProperties';
import { Save, Play } from 'lucide-react';

const nodeTypes: NodeTypes = {
  blockNode: BlockNode,
};

export default function FunnelEditor() {
  const { funnelId } = useParams<{ funnelId: string }>();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (funnelId) {
      loadFunnel();
    }
  }, [funnelId]);

  const loadFunnel = async () => {
    try {
      const { data: funnelData, error: funnelError } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', funnelId)
        .single();

      if (funnelError) throw funnelError;
      setFunnel(funnelData);

      const { data: blocksData, error: blocksError } = await supabase
        .from('funnel_blocks')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('order_index');

      if (blocksError) throw blocksError;

      if (blocksData && blocksData.length > 0) {
        const loadedNodes = blocksData.map((block) => ({
          id: block.id,
          type: 'blockNode',
          position: { x: block.position_x, y: block.position_y },
          data: {
            blockType: block.type,
            content: block.content,
            orderIndex: block.order_index,
          },
        }));

        const loadedEdges = blocksData
          .filter((block) => block.next_block_id)
          .map((block) => ({
            id: `${block.id}-${block.next_block_id}`,
            source: block.id,
            target: block.next_block_id!,
            type: 'smoothstep',
          }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
      }
    } catch (error) {
      console.error('Error loading funnel:', error);
    }
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const addBlock = (blockType: BlockType) => {
    const newNode: Node = {
      id: `temp-${Date.now()}`,
      type: 'blockNode',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        blockType,
        content: getDefaultContent(blockType),
        orderIndex: nodes.length,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const getDefaultContent = (blockType: BlockType) => {
    switch (blockType) {
      case 'text':
        return { text: 'Nova mensagem de texto' };
      case 'question':
        return { text: 'Qual é a sua pergunta?', questionType: 'text' };
      case 'image':
        return { mediaUrl: '', text: '' };
      case 'video':
        return { mediaUrl: '', text: '' };
      case 'audio':
        return { mediaUrl: '' };
      case 'typing_effect':
        return { duration: 2000 };
      case 'recording_effect':
        return { duration: 2000 };
      case 'delay':
        return { duration: 1000 };
      default:
        return {};
    }
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  };

  const saveFunnel = async () => {
    if (!funnelId) return;

    setSaving(true);
    try {
      await supabase.from('funnel_blocks').delete().eq('funnel_id', funnelId);

      // First pass: insert blocks without next_block_id (never specify id, let DB generate)
      const blocksToInsert = nodes.map((node, index) => ({
        funnel_id: funnelId,
        type: node.data.blockType,
        content: node.data.content,
        position_x: node.position.x,
        position_y: node.position.y,
        order_index: index,
        next_block_id: null,
      }));

      const { data: insertedBlocks, error: insertError } = await supabase
        .from('funnel_blocks')
        .insert(blocksToInsert)
        .select();

      if (insertError) throw insertError;

      // Create a map from old IDs to new IDs
      const idMap = new Map<string, string>();
      nodes.forEach((node, index) => {
        if (insertedBlocks && insertedBlocks[index]) {
          idMap.set(node.id, insertedBlocks[index].id);
        }
      });

      // Second pass: update connections with real IDs
      const updates = [];
      for (const node of nodes) {
        const nextEdge = edges.find((edge) => edge.source === node.id);
        if (nextEdge) {
          const newSourceId = idMap.get(node.id);
          const newTargetId = idMap.get(nextEdge.target);

          if (newSourceId && newTargetId) {
            updates.push(
              supabase
                .from('funnel_blocks')
                .update({ next_block_id: newTargetId })
                .eq('id', newSourceId)
            );
          }
        }
      }

      await Promise.all(updates);

      alert('Funil salvo com sucesso!');
      loadFunnel();
    } catch (error) {
      console.error('Error saving funnel:', error);
      alert('Erro ao salvar funil');
    } finally {
      setSaving(false);
    }
  };

  if (!funnel) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{funnel.name}</h1>
          <p className="text-sm text-gray-600">Editor de Funil</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/chat/${funnel.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Play className="w-4 h-4" />
            Testar Chat
          </a>
          <button
            onClick={saveFunnel}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Funil'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        <BlockSidebar onAddBlock={addBlock} />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selectedNode && (
          <BlockProperties
            node={selectedNode}
            onUpdate={(newData) => updateNodeData(selectedNode.id, newData)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
