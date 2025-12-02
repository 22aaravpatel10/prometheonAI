import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  DollarSign,
  Droplet,
  Factory,
  Gauge,
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  Wind,
  Thermometer,
  BarChart3
} from 'lucide-react';
import Layout from '../components/Layout';
import ManufacturingCopilotPanel from '../components/ManufacturingCopilotPanel';

const Dashboard: React.FC = () => {
  // Mock Data
  const metrics = {
    operations: {
      throughput: "1,240 kg/h",
      efficiency: "94.2%",
      activeBatches: 3,
      bottleneck: "Reactor 2 (Cooling)"
    },
    maintenance: {
      healthScore: "88/100",
      upcomingPMs: 2,
      criticalAlerts: 0,
      riskForecast: "Low"
    },
    energy: {
      steam: "4.2 ton/h",
      cooling: "1,200 m³/h",
      nitrogen: "120 Nm³/h",
      cost: "$420/h"
    },
    inventory: {
      critical: 1,
      stockouts: 0,
      deliveries: "2 Pending",
      allocation: "Optimized"
    },
    economics: {
      yieldLoss: "1.2%",
      costPerBatch: "$12,450",
      oee: "87.5%",
      output: "On Target"
    }
  };

  return (
    <Layout>
      <div className="p-6 flex flex-col min-h-full">

        {/* Header Section */}
        <div className="flex justify-between items-end mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-white font-tech tracking-wider">
              COMMAND <span className="text-[#007A73]">CENTER</span>
            </h1>
            <p className="text-gray-500 text-xs font-mono tracking-[0.2em] mt-1">
              REAL-TIME PLANT TELEMETRY & AI ORCHESTRATION
            </p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-sm flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-mono text-gray-400">SYSTEM STATUS: <span className="text-white font-bold">NOMINAL</span></span>
            </div>
            <div className="px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-sm flex items-center gap-3">
              <Clock size={14} className="text-[#007A73]" />
              <span className="text-xs font-mono text-gray-400">SHIFT: <span className="text-white font-bold">A-TEAM</span></span>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-12 gap-4">

          {/* CENTERPIECE: PrometheonAI Panel */}
          {/* On large screens, this is in the middle. On small, it stacks. */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-4 lg:row-start-1 relative group h-[600px] lg:h-auto min-h-[500px]">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-[#007A73] to-transparent opacity-20 blur-sm rounded-sm group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative h-full bg-[#0a0a0a] border border-[#007A73]/30 rounded-sm overflow-hidden flex flex-col shadow-[0_0_50px_-20px_rgba(0,122,115,0.3)]">
              {/* Decorative Corners */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#007A73]"></div>
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#007A73]"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#007A73]"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#007A73]"></div>

              <ManufacturingCopilotPanel
                isOpen={true}
                onClose={() => { }}
                embedded={true}
              />
            </div>
          </div>

          {/* LEFT COLUMN: Operations & Maintenance */}
          <div className="col-span-12 lg:col-span-3 lg:row-start-1 flex flex-col gap-4">

            {/* Operations Status */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-sm p-4 flex flex-col relative overflow-hidden group hover:border-[#007A73]/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4 text-[#007A73]">
                <Activity size={18} />
                <h3 className="font-tech font-bold tracking-wider text-sm">OPERATIONS</h3>
              </div>

              <div className="space-y-4 flex-1">
                <MetricRow label="Throughput" value={metrics.operations.throughput} icon={Factory} />
                <MetricRow label="Efficiency" value={metrics.operations.efficiency} icon={Gauge} trend="up" />
                <MetricRow label="Active Batches" value={metrics.operations.activeBatches.toString()} icon={Layers} />

                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                  <div className="flex items-center gap-2 text-red-400 mb-1">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-bold tracking-wider">BOTTLENECK DETECTED</span>
                  </div>
                  <p className="text-xs text-gray-300">{metrics.operations.bottleneck}</p>
                </div>
              </div>
            </motion.div>

            {/* Maintenance & Reliability */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-sm p-4 flex flex-col relative overflow-hidden group hover:border-[#007A73]/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4 text-[#007A73]">
                <Cpu size={18} />
                <h3 className="font-tech font-bold tracking-wider text-sm">MAINTENANCE</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">HEALTH SCORE</span>
                  <span className="text-xl font-bold text-white font-tech">{metrics.maintenance.healthScore}</span>
                </div>
                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-green-500 w-[88%] h-full"></div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 bg-white/5 rounded-sm border border-white/5">
                    <span className="text-[10px] text-gray-500 block">UPCOMING PMs</span>
                    <span className="text-lg font-bold text-white">{metrics.maintenance.upcomingPMs}</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded-sm border border-white/5">
                    <span className="text-[10px] text-gray-500 block">RISK LEVEL</span>
                    <span className="text-lg font-bold text-green-400">{metrics.maintenance.riskForecast}</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Energy & Inventory */}
          <div className="col-span-12 lg:col-span-3 lg:col-start-10 lg:row-start-1 flex flex-col gap-4">

            {/* Energy & Utilities */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-sm p-4 flex flex-col relative overflow-hidden group hover:border-[#007A73]/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4 text-[#007A73]">
                <Zap size={18} />
                <h3 className="font-tech font-bold tracking-wider text-sm">ENERGY</h3>
              </div>

              <div className="space-y-4">
                <MetricRow label="Steam Flow" value={metrics.energy.steam} icon={Wind} />
                <MetricRow label="Cooling Water" value={metrics.energy.cooling} icon={Droplet} />
                <MetricRow label="Nitrogen" value={metrics.energy.nitrogen} icon={Thermometer} />
                <MetricRow label="Hourly Cost" value={metrics.energy.cost} icon={DollarSign} />
              </div>
            </motion.div>

            {/* Raw Materials */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-sm p-4 flex flex-col relative overflow-hidden group hover:border-[#007A73]/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4 text-[#007A73]">
                <Box size={18} />
                <h3 className="font-tech font-bold tracking-wider text-sm">INVENTORY</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-sm">
                  <span className="text-xs text-yellow-500">CRITICAL LEVELS</span>
                  <span className="text-sm font-bold text-white">{metrics.inventory.critical} Items</span>
                </div>

                <MetricRow label="Stockouts" value={metrics.inventory.stockouts.toString()} icon={AlertTriangle} />
                <MetricRow label="Deliveries" value={metrics.inventory.deliveries} icon={Database} />
              </div>
            </motion.div>

          </div>

          {/* BOTTOM CENTER: Economic Snapshot */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-sm p-4 relative overflow-hidden group hover:border-[#007A73]/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#007A73]">
                  <BarChart3 size={18} />
                  <h3 className="font-tech font-bold tracking-wider text-sm">ECONOMIC SNAPSHOT</h3>
                </div>
                <div className="text-xs font-mono text-gray-500">LAST 24H</div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <EconomicCard label="YIELD LOSS" value={metrics.economics.yieldLoss} trend="down" good={true} />
                <EconomicCard label="COST / BATCH" value={metrics.economics.costPerBatch} />
                <EconomicCard label="OEE" value={metrics.economics.oee} trend="up" good={true} />
                <EconomicCard label="OUTPUT" value={metrics.economics.output} />
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

// Helper Components
const MetricRow = ({ label, value, icon: Icon, trend }: any) => (
  <div className="flex items-center justify-between group/row">
    <div className="flex items-center gap-3">
      <div className="p-1.5 bg-white/5 rounded-sm text-gray-400 group-hover/row:text-white transition-colors">
        <Icon size={14} />
      </div>
      <span className="text-xs text-gray-400 font-mono group-hover/row:text-gray-300 transition-colors">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-white font-tech tracking-wide">{value}</span>
      {trend === 'up' && <TrendingUp size={12} className="text-green-500" />}
      {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
    </div>
  </div>
);

const EconomicCard = ({ label, value, trend, good }: any) => (
  <div className="p-3 bg-white/5 rounded-sm border border-white/5 hover:bg-white/10 transition-colors">
    <p className="text-[10px] text-gray-500 font-mono mb-1">{label}</p>
    <div className="flex items-end gap-2">
      <span className="text-lg font-bold text-white font-tech">{value}</span>
      {trend && (
        <span className={good ? "text-green-500" : "text-red-500"}>
          {good ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </span>
      )}
    </div>
  </div>
);

export default Dashboard;