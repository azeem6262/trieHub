'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { predictRepo } from '../lib/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, PieLabelRenderProps } from 'recharts';
import Tree from 'react-d3-tree';

// --- Type Definitions for our data ---
interface Prediction {
  file: string;
  predicted_language: string;
}

interface FileNode {
  name: string;
  children?: FileNode[];
  attributes?: { language?: string; type?: 'file' | 'directory' };
}

interface RepoData {
  repository: string;
  predictions: Prediction[];
  language_counts: Record<string, number>;
  file_tree: FileNode[]; // Changed to array to match backend
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1975'];

export default function Home() {
  const [repoPath, setRepoPath] = useState('facebook/react');
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [initialDepth, setInitialDepth] = useState<number>(1);
  const [translateX, setTranslateX] = useState<number>(40);
  const [translateY, setTranslateY] = useState<number>(40);
  const [nodeWidth, setNodeWidth] = useState<number>(160);
  const [nodeHeight, setNodeHeight] = useState<number>(100);
  const [sepSiblings, setSepSiblings] = useState<number>(1);
  const [sepNonSiblings, setSepNonSiblings] = useState<number>(1.3);
  const treeContainerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [controlsOpen, setControlsOpen] = useState<boolean>(true);

  const centerTree = () => {
    const container = treeContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setTranslateX(rect.width / 2);
    setTranslateY(60);
  };
  
  // Center tree on initial load after data is fetched
  useEffect(() => {
    if(repoData) {
        centerTree();
    }
  }, [repoData]);


  const resetTreeControls = () => {
    setTranslateX(40);
    setTranslateY(40);
    setNodeWidth(160);
    setNodeHeight(100);
    setSepSiblings(1);
    setSepNonSiblings(1.3);
    setZoom(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRepoData(null);

    try {
      const data = await predictRepo(repoPath);
      setRepoData(data as RepoData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
    setIsLoading(false);
  };

  const languageData = useMemo(() => {
    // --- FIX: More robust check for data existence ---
    if (!repoData || !repoData.language_counts) {
      return [];
    }
    return Object.entries(repoData.language_counts).map(([name, value]) => ({ name, value }));
  }, [repoData]);

  const languageColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    languageData.forEach((item, idx) => {
      map[item.name] = COLORS[idx % COLORS.length];
    });
    return map;
  }, [languageData]);

  const renderCustomNode = ({ nodeDatum, toggleNode }: { nodeDatum: FileNode; toggleNode: () => void }) => {
    const isDirectory = !!nodeDatum.children;
    const language = nodeDatum?.attributes?.language as string | undefined;
    const color = language ? languageColorMap[language] ?? '#999' : '#6B7280';
    return (
      <g>
        <foreignObject width={260} height={84} x={-130} y={-42}>
          <div style={{ width: 260, height: 84 }} className="relative rounded-md p-[1.5px] bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 shadow-[0_0_18px_rgba(168,85,247,0.25)]">
            <div className="bg-black/95 rounded-md h-full w-full flex items-center px-3 py-2 gap-3">
              <div className="text-xl">{isDirectory ? '📁' : '📄'}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold text-white">{nodeDatum.name}</div>
                {!isDirectory && language && (
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-purple-200">{language}</span>
                  </div>
                )}
              </div>
              {isDirectory && (
                <button onClick={toggleNode} className="ml-2 text-xs bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-2 py-1 rounded">
                  Toggle
                </button>
              )}
            </div>
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <main className="min-h-screen w-full bg-black text-white p-4 sm:p-8">
      <div className="container mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
            GitHub Repository Analysis
          </h1>
          <p className="text-lg text-gray-300 mt-3">Enter a repository to predict the language of each file.</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8 max-w-2xl mx-auto">
          <input 
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="e.g., facebook/react"
            className="w-full px-4 py-3 bg-black border border-purple-700/50 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/70 text-white placeholder:text-gray-500"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-md hover:from-purple-500 hover:to-fuchsia-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(168,85,247,0.35)]"
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        {error && <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-md max-w-2xl mx-auto">Error: {error}</div>}
        
        {repoData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
              {/* Language Breakdown */}
              <div className="relative rounded-lg p-[1.5px] bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                <div className="bg-black rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-4 text-purple-300">Language Breakdown</h2>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={languageData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(props: PieLabelRenderProps) => `${props.name}: ${((props.percent as number) * 100).toFixed(0)}%`}
                        >
                          {languageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={languageColorMap[entry.name]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #4c1d95' }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* File Predictions */}
              <div className="relative rounded-lg p-[1.5px] bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                <div className="bg-black rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-4 text-purple-300">File Predictions</h2>
                  <div className="overflow-y-auto max-h-96 pr-4">
                    <ul className="space-y-2">
                      {repoData.predictions.map((p:Prediction, index: number) => (
                        <li key={index} className="flex justify-between items-center bg-black/60 p-3 rounded-md border border-purple-800/30">
                          <span className="font-mono text-gray-300 break-all">{p.file}</span>
                          <span className="font-semibold ml-4 flex-shrink-0 inline-flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: languageColorMap[p.predicted_language] ?? '#999' }} />
                            <span className="text-purple-300">{p.predicted_language}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative rounded-lg p-[1.5px] bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.2)] w-full">
                <div className="bg-black rounded-lg">
                  <button type="button" onClick={() => setControlsOpen(!controlsOpen)} className="w-full flex items-center justify-between px-4 py-3">
                    <h3 className="text-lg font-semibold text-purple-300">Tree Controls</h3>
                    <span className="text-purple-300">{controlsOpen ? '−' : '+'}</span>
                  </button>
                  {controlsOpen && (
                    <div className="px-4 pb-4">
                      {/* ... Tree Controls JSX ... */}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Full-width Repository File Tree at the bottom */}
            <div className="mt-8">
              <div className="relative rounded-lg p-[1.5px] bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.25)] min-h-[600px]">
                <div className="bg-black rounded-lg p-6 h-full">
                  <h2 className="text-2xl font-bold mb-4 text-purple-300">Repository File Tree</h2>
                  {repoData.file_tree ? (
                    <div className="w-full h-[520px]" ref={treeContainerRef}>
                      <style>{`.rd3t-link { stroke: #a855f7 !important; stroke-width: 1.5px !important; } .rd3t-label__title { fill: white !important; } .rd3t-label__attributes { fill: #c4b5fd !important; }`}</style>
                      <Tree
                        data={repoData.file_tree}
                        orientation={orientation}
                        pathFunc="step"
                        translate={{ x: translateX, y: translateY }}
                        nodeSize={{ x: nodeWidth, y: nodeHeight }}
                        separation={{ siblings: sepSiblings, nonSiblings: sepNonSiblings }}
                        renderCustomNodeElement={renderCustomNode}
                        zoomable
                        initialDepth={initialDepth}
                        zoom={zoom}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-400">No file tree data available.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {/* Footer */}
        <footer className="mt-16">
          {/* ... Footer JSX ... */}
        </footer>
      </div>
    </main>
  );
}