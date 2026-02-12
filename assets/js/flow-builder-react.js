/**
 * IntakeFlow Visual Canvas
 * v0.28.9 - FEATURE: Delete connections by hovering and clicking
 */

(function() {
    'use strict';
    
    console.log('🎨 Initializing IntakeFlow Canvas v0.28.9...');
    
    const { useState, useCallback, useEffect, useMemo } = React;
    const h = React.createElement;
    
    // Main Canvas Component
    function FlowCanvas(props) {
        const [nodes, setNodes] = useState(props.initialNodes || []);
        const [edges, setEdges] = useState(props.initialEdges || []);
        const [selectedNodeId, setSelectedNodeId] = useState(null);
        const [selectedEdgeId, setSelectedEdgeId] = useState(null);
        const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
        const [draggedNode, setDraggedNode] = useState(null);
        const [connectingFrom, setConnectingFrom] = useState(null);
        const [connectionPreviewMouse, setConnectionPreviewMouse] = useState(null);
        const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
        const [isPanning, setIsPanning] = useState(false);
        const [panStart, setPanStart] = useState({ x: 0, y: 0 });
        const [zoom, setZoom] = useState(1);
        const [updateTrigger, setUpdateTrigger] = useState(0);
        const [isDraggingNode, setIsDraggingNode] = useState(false);
        const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
        
        // New approach: Use mouse events instead of HTML5 drag
        const handleNodeMouseDown = useCallback((e, node) => {
            // Only drag on left click, not on handles/buttons
            if (e.button !== 0) return;
            if (e.target.closest('.intakeflow-node-delete')) return;
            if (e.target.classList.contains('intakeflow-node-delete')) return;
            
            console.log('🎯 Node mouse down:', node.id);
            
            const rect = e.currentTarget.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            
            setDraggedNode(node);
            setIsDraggingNode(true);
            setDragOffset({ x: offsetX, y: offsetY });
            
            e.stopPropagation(); // Prevent canvas pan
        }, []);
        
        const handleDragOver = useCallback((e) => {
            e.preventDefault();
            e.stopPropagation();
            // Accept all drops
            e.dataTransfer.dropEffect = 'copy';
        }, []);
        
        // Handle drops from palette only (node movement now uses mouse events)
        const handleDrop = useCallback((e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('📥 Drop event on canvas (React handler)');
            
            const paletteNodeType = e.dataTransfer.getData('intakeflow/node-type');
            
            console.log('🔍 Drop data:', { paletteNodeType });
            
            // ONLY handle palette drops
            if (paletteNodeType) {
                console.log('🎨 Palette drop - creating node');
                
                const canvas = e.currentTarget;
                const rect = canvas.getBoundingClientRect();
                const dropX = (e.clientX - rect.left - panOffset.x) / zoom;
                const dropY = (e.clientY - rect.top - panOffset.y) / zoom;
                
                if (window.IntakeFlowBuilder && window.IntakeFlowBuilder.addNodeAtPosition) {
                    window.IntakeFlowBuilder.addNodeAtPosition(paletteNodeType, dropX, dropY, false);
                }
                return;
            }
            
            console.log('⚠️ Not a palette drop - ignoring');
        }, [zoom, panOffset]);
        
        const handleNodeDoubleClick = useCallback((node) => {
            console.log('🖱️ Node double-clicked:', node.id);
            setSelectedNodeId(node.id);
            if (props.onNodeClick) {
                props.onNodeClick(node);
            }
        }, [props]);
        
        const handleOutputClick = useCallback((e, node, handleId = null) => {
            e.stopPropagation();
            const connectionId = handleId ? `${node.id}:${handleId}` : node.id;
            
            if (connectingFrom === connectionId) {
                console.log('❌ Connection cancelled');
                setConnectingFrom(null);
            } else {
                console.log('🔗 Connection start from', connectionId);
                setConnectingFrom(connectionId);
            }
        }, [connectingFrom]);
        
        const handleInputClick = useCallback((e, targetNode) => {
            e.stopPropagation();
            
            if (!connectingFrom) {
                console.log('⚠️ No connection in progress');
                return;
            }
            
            if (connectingFrom === targetNode.id) {
                console.log('❌ Cannot connect to self');
                setConnectingFrom(null);
                setConnectionPreviewMouse(null);
                return;
            }
            
            console.log('✅ Connection complete:', connectingFrom, '→', targetNode.id);
            
            const [sourceNodeId, sourceHandleId] = connectingFrom.includes(':') 
                ? connectingFrom.split(':') 
                : [connectingFrom, null];
            
            const newEdge = {
                id: `edge-${Date.now()}`,
                source: sourceNodeId,
                sourceHandle: sourceHandleId,
                target: targetNode.id,
                type: 'smoothstep',
                animated: true
            };
            
            setEdges(prevEdges => {
                const updatedEdges = [...prevEdges, newEdge];
                
                setTimeout(() => {
                    if (window.IntakeFlowBuilder && window.IntakeFlowBuilder.selectedNode) {
                        const selectedNode = window.IntakeFlowBuilder.selectedNode;
                        if (selectedNode.id === targetNode.id && selectedNode.data.nodeType === 'branch') {
                            console.log('🔄 Refreshing branch editor with new connection');
                            window.IntakeFlowBuilder.selectNode(selectedNode);
                        }
                    }
                }, 50);
                
                return updatedEdges;
            });
            setConnectingFrom(null);
            setConnectionPreviewMouse(null);
        }, [connectingFrom]);
        
        const handleCanvasMouseDown = useCallback((e) => {
            if (e.target.id === 'intakeflow-canvas' || e.target.classList.contains('canvas-background')) {
                setIsPanning(true);
                setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }
        }, [panOffset]);
        
        const handleCanvasMouseMove = useCallback((e) => {
            if (isPanning) {
                setPanOffset({
                    x: e.clientX - panStart.x,
                    y: e.clientY - panStart.y
                });
            } else if (isDraggingNode && draggedNode) {
                // Node dragging
                const canvas = document.getElementById('intakeflow-canvas');
                const rect = canvas.getBoundingClientRect();
                
                const newX = (e.clientX - rect.left - panOffset.x - dragOffset.x) / zoom;
                const newY = (e.clientY - rect.top - panOffset.y - dragOffset.y) / zoom;
                
                setNodes(prevNodes => 
                    prevNodes.map(n => 
                        n.id === draggedNode.id 
                            ? { ...n, position: { x: newX, y: newY } }
                            : n
                    )
                );
            } else if (connectingFrom) {
                // Connection preview - track mouse position
                const canvas = document.getElementById('intakeflow-canvas');
                const rect = canvas.getBoundingClientRect();
                setConnectionPreviewMouse({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        }, [isPanning, panStart, isDraggingNode, draggedNode, zoom, panOffset, dragOffset, connectingFrom]);
        
        const handleCanvasMouseUp = useCallback(() => {
            if (isDraggingNode) {
                console.log('✅ Node drag complete');
                setIsDraggingNode(false);
                setDraggedNode(null);
                setDragOffset({ x: 0, y: 0 });
            }
            setIsPanning(false);
        }, [isDraggingNode]);
        
        const handleWheel = useCallback((e) => {
            e.preventDefault();
            const delta = e.deltaY * -0.001;
            const newZoom = Math.min(Math.max(0.1, zoom + delta), 3);
            setZoom(newZoom);
        }, [zoom]);
        
        const handleCanvasClick = useCallback((e) => {
            if (e.target.id === 'intakeflow-canvas' || e.target.classList.contains('canvas-background')) {
                if (connectingFrom) {
                    console.log('❌ Connection cancelled (clicked canvas)');
                    setConnectingFrom(null);
                    setConnectionPreviewMouse(null);
                }
            }
        }, [connectingFrom]);
        
        const apiInstance = useMemo(() => ({
            getFlow: () => ({ nodes, edges }),
            setFlow: (flowData) => {
                if (flowData.nodes) setNodes([...flowData.nodes]);
                if (flowData.edges) setEdges([...flowData.edges]);
            },
            getState: () => ({ zoom, panOffset })
        }), [nodes, edges, zoom, panOffset]);
        
        useEffect(() => {
            window.IntakeFlowReactInstance = apiInstance;
            console.log('✅ IntakeFlowReactInstance API updated');
            return () => { delete window.IntakeFlowReactInstance; };
        }, [apiInstance]);
        
        useEffect(() => {
            if (props.initialNodes && props.initialNodes.length !== nodes.length) {
                console.log('🔄 Syncing from props:', props.initialNodes.length, 'nodes');
                setNodes(props.initialNodes);
            }
        }, [props.initialNodes]);
        
        useEffect(() => {
            const timer = setTimeout(() => setUpdateTrigger(prev => prev + 1), 50);
            return () => clearTimeout(timer);
        }, [nodes, edges]);
        
        const getHandlePosition = useCallback((node, side, handleId = null) => {
            const baseX = node.position.x * zoom + panOffset.x;
            const baseY = node.position.y * zoom + panOffset.y;
            
            const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
            let actualWidth, actualHeight;
            
            if (nodeElement) {
                const rect = nodeElement.getBoundingClientRect();
                actualWidth = rect.width;
                actualHeight = rect.height;
            } else {
                const paddingX = 20 * zoom;
                const paddingY = 15 * zoom;
                const nodeContentWidth = 200 * zoom;
                actualWidth = nodeContentWidth + (paddingX * 2);
                const estimatedContentHeight = 35 * zoom;
                actualHeight = (paddingY * 2) + estimatedContentHeight;
            }
            
            if (side === 'bottom') {
                if (node.data.nodeType === 'branch' && node.data.output_groups && node.data.output_groups.length > 0) {
                    if (handleId) {
                        const groupIndex = node.data.output_groups.findIndex(group => group.id === handleId);
                        if (groupIndex !== -1) {
                            const totalGroups = node.data.output_groups.length;
                            const handleX = baseX + ((groupIndex + 1) / (totalGroups + 1)) * actualWidth;
                            return { x: handleX, y: baseY + actualHeight };
                        }
                    }
                    const totalGroups = node.data.output_groups.length;
                    const handleX = baseX + (1 / (totalGroups + 1)) * actualWidth;
                    return { x: handleX, y: baseY + actualHeight };
                }
                return { x: baseX + (actualWidth / 2), y: baseY + actualHeight };
            } else {
                return { x: baseX + (actualWidth / 2), y: baseY };
            }
        }, [zoom, panOffset, updateTrigger]);
        
        const connectionLines = edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;
            
            const start = getHandlePosition(sourceNode, 'bottom', edge.sourceHandle);
            const end = getHandlePosition(targetNode, 'top');
            
            const handleRadius = 6;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const shortenFactor = (distance - handleRadius) / distance;
            
            const adjustedEndX = start.x + dx * shortenFactor;
            const adjustedEndY = start.y + dy * shortenFactor;
            
            const midY = (start.y + adjustedEndY) / 2;
            const path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${adjustedEndX} ${midY}, ${adjustedEndX} ${adjustedEndY}`;
            
            const isHovered = hoveredEdgeId === edge.id;
            
            // Calculate midpoint for delete button
            const midX = (start.x + adjustedEndX) / 2;
            const midPointY = (start.y + adjustedEndY) / 2;
            
            return h('svg', {
                key: edge.id,
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 0
                }
            }, [
                // Invisible wider path for easier hovering/clicking
                h('path', {
                    d: path,
                    stroke: 'transparent',
                    strokeWidth: 20,
                    fill: 'none',
                    style: { pointerEvents: 'stroke', cursor: 'pointer' },
                    onMouseEnter: () => setHoveredEdgeId(edge.id),
                    onMouseLeave: () => setHoveredEdgeId(null),
                    onClick: (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this connection?')) {
                            console.log('🗑️ Deleting edge:', edge.id);
                            setEdges(prevEdges => prevEdges.filter(e => e.id !== edge.id));
                        }
                    }
                }),
                // Visible connection line
                h('path', {
                    d: path,
                    stroke: isHovered ? '#d32f2f' : '#2196f3',
                    strokeWidth: isHovered ? 3 : 2,
                    fill: 'none',
                    markerEnd: 'url(#arrowhead)',
                    style: { 
                        pointerEvents: 'none',
                        transition: 'stroke 0.2s, stroke-width 0.2s'
                    }
                }),
                // Delete button on hover
                isHovered ? h('g', {
                    style: { pointerEvents: 'none' }
                }, [
                    h('circle', {
                        cx: midX,
                        cy: midPointY,
                        r: 12,
                        fill: '#d32f2f',
                        stroke: '#fff',
                        strokeWidth: 2
                    }),
                    h('text', {
                        x: midX,
                        y: midPointY,
                        textAnchor: 'middle',
                        dominantBaseline: 'middle',
                        fill: '#fff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        style: { userSelect: 'none' }
                    }, '×')
                ]) : null
            ]);
        });
        
        // Connection preview line (while dragging)
        const connectionPreviewLine = (() => {
            if (!connectingFrom || !connectionPreviewMouse) return null;
            
            const [sourceNodeId, sourceHandleId] = connectingFrom.includes(':') 
                ? connectingFrom.split(':') 
                : [connectingFrom, null];
            
            const sourceNode = nodes.find(n => n.id === sourceNodeId);
            if (!sourceNode) return null;
            
            const start = getHandlePosition(sourceNode, 'bottom', sourceHandleId);
            const end = { x: connectionPreviewMouse.x, y: connectionPreviewMouse.y };
            
            const midY = (start.y + end.y) / 2;
            const path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
            
            return h('svg', {
                key: 'connection-preview',
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 100
                }
            }, [
                h('path', {
                    d: path,
                    stroke: '#ff9800',
                    strokeWidth: 3,
                    strokeDasharray: '8,4',
                    fill: 'none',
                    opacity: 0.7
                })
            ]);
        })();
        
        const nodeElements = nodes.map(node => {
            const colors = {
                message: { bg: '#e3f2fd', border: '#2196f3', text: '#1976d2' },
                question: { bg: '#fff3e0', border: '#ff9800', text: '#f57c00' },
                output: { bg: '#e0f2f1', border: '#009688', text: '#00695c' },
                click: { bg: '#fce4ec', border: '#e91e63', text: '#c2185b' },
                branch: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' },
                action: { bg: '#e8f5e9', border: '#4caf50', text: '#388e3c' }
            };
            
            const color = colors[node.data.nodeType] || colors.message;
            const isSelected = selectedNodeId === node.id;
            const isConnecting = connectingFrom === node.id;
            
            return h('div', {
                key: node.id,
                className: 'intakeflow-node-container',
                'data-node-id': node.id,
                style: {
                    position: 'absolute',
                    left: (node.position.x * zoom + panOffset.x) + 'px',
                    top: (node.position.y * zoom + panOffset.y) + 'px',
                    padding: (15 * zoom) + 'px ' + (20 * zoom) + 'px',
                    borderRadius: (8 * zoom) + 'px',
                    border: `${2 * zoom}px solid ${color.border}`,
                    background: color.bg,
                    minWidth: (200 * zoom) + 'px',
                    cursor: isDraggingNode && draggedNode && draggedNode.id === node.id ? 'grabbing' : 'grab',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                    transform: `scale(${isSelected ? 1.02 : 1})`,
                    transition: isDraggingNode && draggedNode && draggedNode.id === node.id ? 'none' : 'all 0.2s',
                    zIndex: isSelected ? 10 : (isDraggingNode && draggedNode && draggedNode.id === node.id ? 100 : 1),
                    fontSize: (13 * zoom) + 'px',
                    userSelect: 'none'
                },
                onMouseDown: (e) => handleNodeMouseDown(e, node),
                onDoubleClick: () => handleNodeDoubleClick(node)
            }, [
                h('button', {
                    key: 'delete-btn',
                    className: 'intakeflow-node-delete',
                    style: {
                        position: 'absolute',
                        top: (4 * zoom) + 'px',
                        right: (4 * zoom) + 'px',
                        width: (20 * zoom) + 'px',
                        height: (20 * zoom) + 'px',
                        borderRadius: '50%',
                        background: '#d32f2f',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: (12 * zoom) + 'px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        zIndex: 20,
                        pointerEvents: 'auto'
                    },
                    onMouseDown: (e) => e.stopPropagation(),
                    onClick: (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this node?')) {
                            if (window.IntakeFlowBuilder) {
                                window.IntakeFlowBuilder.selectedNode = node;
                                window.IntakeFlowBuilder.deleteNode();
                            }
                        }
                    },
                    onMouseEnter: (e) => { e.target.style.opacity = '1'; },
                    title: 'Delete node'
                }, '×'),
                
                h('div', {
                    key: 'input-handle',
                    style: {
                        position: 'absolute',
                        left: '50%',
                        top: (-8 * zoom) + 'px',
                        transform: 'translateX(-50%)',
                        width: (12 * zoom) + 'px',
                        height: (12 * zoom) + 'px',
                        borderRadius: '50%',
                        background: '#fff',
                        border: `${2 * zoom}px solid ${color.border}`,
                        cursor: 'pointer',
                        zIndex: 10,
                        pointerEvents: 'auto'
                    },
                    onMouseDown: (e) => e.stopPropagation(),
                    onClick: (e) => handleInputClick(e, node),
                    title: connectingFrom ? 'Click to complete connection' : 'Input'
                }),
                
                ...(function() {
                    const nodeType = node.data.nodeType;
                    
                    if (nodeType === 'branch' && node.data.output_groups && node.data.output_groups.length > 0) {
                        return node.data.output_groups.map((group, index) => {
                            const totalGroups = node.data.output_groups.length;
                            const handleLeft = ((index + 1) / (totalGroups + 1)) * 100;
                            const isThisHandleConnecting = connectingFrom === node.id + ':' + group.id;
                            const tooltip = group.conditions.map(c => c.value).join(' ' + group.logic.toUpperCase() + ' ');
                            
                            return h('div', {
                                key: 'output-' + group.id,
                                style: {
                                    position: 'absolute',
                                    left: handleLeft + '%',
                                    bottom: (-8 * zoom) + 'px',
                                    transform: 'translateX(-50%)',
                                    width: (12 * zoom) + 'px',
                                    height: (12 * zoom) + 'px',
                                    borderRadius: '50%',
                                    background: isThisHandleConnecting ? '#ff9800' : color.border,
                                    border: `${2 * zoom}px solid #fff`,
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    boxShadow: isThisHandleConnecting ? '0 0 0 4px rgba(255,152,0,0.3)' : 'none',
                                    pointerEvents: 'auto'
                                },
                                onMouseDown: (e) => e.stopPropagation(),
                                onClick: (e) => {
                                    e.stopPropagation();
                                    handleOutputClick(e, node, group.id);
                                },
                                title: tooltip || group.label
                            });
                        });
                    }
                    
                    return [h('div', {
                        key: 'output-handle',
                        style: {
                            position: 'absolute',
                            left: '50%',
                            bottom: (-8 * zoom) + 'px',
                            transform: 'translateX(-50%)',
                            width: (12 * zoom) + 'px',
                            height: (12 * zoom) + 'px',
                            borderRadius: '50%',
                            background: isConnecting ? '#ff9800' : color.border,
                            border: `${2 * zoom}px solid #fff`,
                            cursor: 'pointer',
                            zIndex: 10,
                            boxShadow: isConnecting ? '0 0 0 4px rgba(255,152,0,0.3)' : 'none',
                            pointerEvents: 'auto'
                        },
                        onMouseDown: (e) => e.stopPropagation(),
                        onClick: (e) => handleOutputClick(e, node),
                        title: isConnecting ? 'Click again to cancel' : 'Click to start connection'
                    })];
                })(),
                
                h('div', {
                    key: 'content-wrapper',
                    style: {
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }
                }, [
                    h('div', {
                        key: 'type',
                        style: {
                            fontWeight: 'bold',
                            fontSize: (10 * zoom) + 'px',
                            color: color.text,
                            marginBottom: (8 * zoom) + 'px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }
                    }, node.data.nodeType || 'NODE'),
                    h('div', {
                        key: 'label',
                        style: {
                            fontSize: (13 * zoom) + 'px',
                            color: '#333',
                            lineHeight: '1.4'
                        }
                    }, node.data.label || 'Untitled')
                ])
            ]);
        });
        
        return h('div', {
            id: 'intakeflow-canvas',
            className: 'canvas-background',
            style: {
                width: '100%',
                height: '100%',
                background: '#fafafa',
                backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
                backgroundSize: (20 * zoom) + 'px ' + (20 * zoom) + 'px',
                backgroundPosition: panOffset.x + 'px ' + panOffset.y + 'px',
                position: 'relative',
                overflow: 'hidden',
                cursor: isPanning ? 'grabbing' : (connectingFrom ? 'crosshair' : 'grab')
            },
            onDragOver: handleDragOver,
            onDrop: handleDrop,
            onClick: handleCanvasClick,
            onMouseDown: handleCanvasMouseDown,
            onMouseMove: handleCanvasMouseMove,
            onMouseUp: handleCanvasMouseUp,
            onWheel: handleWheel
        }, [
            h('svg', {
                key: 'defs',
                style: { position: 'absolute', width: 0, height: 0 }
            }, [
                h('defs', {}, [
                    h('marker', {
                        id: 'arrowhead',
                        markerWidth: 10,
                        markerHeight: 10,
                        refX: 9,
                        refY: 3,
                        orient: 'auto',
                        markerUnits: 'strokeWidth'
                    }, [
                        h('path', {
                            d: 'M0,0 L0,6 L9,3 z',
                            fill: '#2196f3'
                        })
                    ])
                ])
            ]),
            
            ...connectionLines,
            connectionPreviewLine,
            
            h('div', {
                key: 'controls',
                style: {
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    zIndex: 1000
                }
            }, [
                h('button', {
                    key: 'zoom-in',
                    style: {
                        padding: '8px 12px',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    },
                    onClick: () => setZoom(Math.min(3, zoom + 0.1)),
                    title: 'Zoom in'
                }, '+'),
                h('button', {
                    key: 'zoom-out',
                    style: {
                        padding: '8px 12px',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        lineHeight: '1'
                    },
                    onClick: () => setZoom(Math.max(0.1, zoom - 0.1)),
                    title: 'Zoom out'
                }, '-'),
                h('button', {
                    key: 'reset',
                    style: {
                        padding: '8px 12px',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'Arial, sans-serif'
                    },
                    onClick: () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); },
                    title: 'Reset view'
                }, '↻')
            ]),
            
            h('div', {
                key: 'info',
                style: {
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '8px 12px',
                    background: 'white',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#666',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 1000
                }
            }, [
                h('div', { key: 'nodes' }, `${nodes.length} node${nodes.length !== 1 ? 's' : ''}`),
                connectingFrom ? h('div', {
                    key: 'connecting',
                    style: { color: '#ff9800', fontWeight: 'bold', marginTop: '4px' }
                }, '🔗 Click input to connect') : null
            ]),
            
            h('div', {
                key: 'zoom-indicator',
                style: {
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    padding: '4px 8px',
                    background: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#666',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 1000
                }
            }, `${Math.round(zoom * 100)}%`),
            
            ...nodeElements,
            
            nodes.length === 0 ? h('div', {
                key: 'empty',
                style: {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                }
            }, [
                h('div', { key: 'icon', style: { fontSize: '48px', marginBottom: '10px' } }, '📋'),
                h('div', { key: 'text' }, 'Drag nodes from palette above or click buttons to add')
            ]) : null
        ]);
    }
    
    window.IntakeFlowCanvasComponent = FlowCanvas;
    console.log('✅✅✅ IntakeFlow Canvas v0.28.9 ready! ✅✅✅');
    
})();
