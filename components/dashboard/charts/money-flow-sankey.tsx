'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SankeyData {
    nodes: Array<{ name: string }>;
    links: Array<{ source: number; target: number; value: number }>;
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
];

export function MoneyFlowSankey({ data, currency = 'USD' }: { data: SankeyData, currency?: string }) {
    const layout = useMemo(() => {
        if (!data || !data.nodes || !data.links || data.links.length === 0) return null;

        const width = 800;
        const height = 450;
        const nodeWidth = 14;
        const padding = 50;
        
        // Detect columns based on link flow
        const nodeIncomingWeight = new Array(data.nodes.length).fill(0);
        const nodeOutgoingWeight = new Array(data.nodes.length).fill(0);
        
        data.links.forEach(l => {
            nodeOutgoingWeight[l.source] += l.value;
            nodeIncomingWeight[l.target] += l.value;
        });

        // Column logic: 0 for source only, 1 for both (should be none now), 2 for sink only
        const nodeCols = data.nodes.map((_, i) => {
            if (nodeIncomingWeight[i] === 0) return 0;
            if (nodeOutgoingWeight[i] === 0) return 2;
            return 1;
        });

        const activeCols = Array.from(new Set(nodeCols)).sort();
        const numCols = activeCols.length;
        const columnGap = (width - 2 * padding) / (numCols === 1 ? 1 : 2); // Still allow 3 columns if logic changes back

        const colSums: Record<number, number> = {};
        activeCols.forEach(col => colSums[col] = 0);
        data.nodes.forEach((_, i) => {
            colSums[nodeCols[i]] = (colSums[nodeCols[i]] || 0) + Math.max(nodeIncomingWeight[i], nodeOutgoingWeight[i]);
        });

        const maxColSum = Math.max(...Object.values(colSums));
        const availableHeight = height - 100;
        const scale = availableHeight / (maxColSum || 1);

        const nodes = data.nodes.map((n, i) => {
            const h = Math.max(nodeIncomingWeight[i], nodeOutgoingWeight[i]) * scale;
            return {
                index: i,
                name: n.name,
                col: nodeCols[i],
                x: padding + nodeCols[i] * columnGap,
                h: Math.max(h, 4), // Minimum visibility
                sy: 0,
                offsetS: 0,
                offsetT: 0
            };
        });

        const columnPadding = 24;
        activeCols.forEach(col => {
            const nodesInCol = nodes.filter(n => n.col === col);
            if (nodesInCol.length === 0) return;

            const totalHeightForPading = (nodesInCol.length - 1) * columnPadding;
            const actualNodesSum = nodesInCol.reduce((sum, n) => sum + n.h, 0);
            
            let currentY = (height - (actualNodesSum + totalHeightForPading)) / 2;
            if (currentY < 40) currentY = 40;

            nodes
                .filter(n => n.col === col)
                .sort((a, b) => b.h - a.h)
                .forEach(n => {
                    n.sy = currentY;
                    n.offsetS = 0;
                    n.offsetT = 0;
                    currentY += n.h + columnPadding;
                });
        });

        const links = data.links.map((l, i) => {
            const src = nodes[l.source];
            const dst = nodes[l.target];
            const thickness = Math.max(l.value * scale, 1);

            const sx = src.x + nodeWidth;
            const tx = dst.x;

            const sy = src.sy + src.offsetS + thickness / 2;
            src.offsetS += thickness;

            const ty = dst.sy + dst.offsetT + thickness / 2;
            dst.offsetT += thickness;

            // Curved path
            const gap = tx - sx;
            const cp1x = sx + gap * 0.45;
            const cp2x = tx - gap * 0.45;
            const path = `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ty}, ${tx} ${ty}`;

            return {
                path,
                thickness,
                color: COLORS[l.source % COLORS.length],
                source: src.name,
                target: dst.name,
                value: l.value
            };
        });

        return { nodes, links, width, height };
    }, [data]);

    if (!layout) return null;

    return (
        <TooltipProvider>
            <Card className="h-full border-none shadow-none bg-transparent">
                <CardHeader className="px-4 pb-2">
                    <CardTitle className="text-xl font-black tracking-tight uppercase border-b-2 border-primary w-fit pr-8 mb-1">Financial Movement</CardTitle>
                    <CardDescription>Tracing income path to your goals</CardDescription>
                </CardHeader>
                <CardContent className="px-4">
                    <div className="relative aspect-[16/9] w-full mt-2 bg-muted/5 rounded-2xl border border-primary/5 p-4 overflow-hidden">
                        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full h-full overflow-visible">
                            {layout.links.map((link, i) => (
                                <Tooltip key={`link-${i}`}>
                                    <TooltipTrigger asChild>
                                        <motion.path
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 1, delay: i * 0.02 }}
                                            d={link.path}
                                            stroke={link.color}
                                            strokeWidth={link.thickness}
                                            fill="none"
                                            strokeOpacity={0.25}
                                            className="hover:stroke-opacity-70 transition-all cursor-pointer"
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-background/95 border-2 border-primary shadow-2xl">
                                        <div className="text-xs font-black uppercase text-muted-foreground">{link.source} → {link.target}</div>
                                        <div className="text-lg font-mono font-black text-primary leading-none mt-1">{formatCurrency(link.value, currency)}</div>
                                    </TooltipContent>
                                </Tooltip>
                            ))}

                            {layout.nodes.map((node, i) => (
                                <g key={`node-${i}`}>
                                    <motion.rect
                                        initial={{ opacity: 0, scaleY: 0 }}
                                        animate={{ opacity: 1, scaleY: 1 }}
                                        transition={{ duration: 0.5, delay: node.col * 0.2 }}
                                        x={node.x}
                                        y={node.sy}
                                        width={14}
                                        height={node.h}
                                        fill={COLORS[node.index % COLORS.length]}
                                        rx={1}
                                    />
                                    <motion.text
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: node.col * 0.2 + 0.5 }}
                                        x={node.col === 0 ? node.x - 12 : node.x + 24}
                                        y={node.sy + node.h / 2}
                                        textAnchor={node.col === 0 ? "end" : "start"}
                                        className="text-[11px] font-black fill-foreground/90 uppercase tracking-tighter"
                                        dominantBaseline="middle"
                                    >
                                        {node.name}
                                    </motion.text>
                                </g>
                            ))}
                        </svg>
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
