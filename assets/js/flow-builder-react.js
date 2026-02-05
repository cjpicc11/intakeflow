/**
 * IntakeFlow Visual Canvas
 * Simple drag-and-drop canvas
 */

(function() {
    'use strict';
    
    console.log('ðŸŽ¨ Initializing IntakeFlow Canvas...');
    
    const { useState, useCallback, useEffect, useMemo } = React;
    const h = React.createElement;
    
    // Main Canvas Component
    function FlowCanvas(props) {
        // console.log('ðŸ—ï¸ FlowCanvas mounting with', props.initialNodes?.length || 0, 'nodes');
        
        const [nodes, setNodes] = useState(props.initialNodes || []);
        const [edges, setEdges] = useState(props.initialEdges || []);
        const [selectedNodeId, setSelectedNodeId] = useState(null);
        const [selectedEdgeId, setSelectedEdgeId] = useState(null);
        const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
        const [draggedNode, setDraggedNode] = useState(null);
        const [connectingFrom, setConnectingFrom] = useState(null); // Node ID we're connecting from
        const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Canvas pan offset
        const [isPanning, setIsPanning] = useState(false);
        const [panStart, setPanStart] = useState({ x: 0, y: 0 });
        const [zoom, setZoom] = useState(1);
        const [updateTrigger, setUpdateTrigger] = useState(0); // Force connection recalc
        
        // console.log('ðŸ“Š Canvas state: nodes =', nodes.length);
        
        // Debug: Log when nodes actually change - REMOVED TO REDUCE CONSOLE SPAM
        
        const handleDragStart = useCallback((e, node) => {
            e.stopPropagation(); // Prevent canvas pan
            console.log('ðŸŽ¯ Drag start:', node.id);
            setDraggedNode(node);
            e.dataTransfer.effectAllowed = 'move';
        }, []);
        
        const handleDragOver = useCallback((e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }, []);
        
        const handleDrop = useCallback((e) => {
            e.preventDefault();
            if (!draggedNode) return;
            
            const canvas = e.currentTarget;
            const rect = canvas.getBoundingClientRect();
            // Account for zoom and pan
            const x = (e.clientX - rect.left - panOffset.x) / zoom - 100;
            const y = (e.clientY - rect.top - panOffset.y) / zoom - 25;
            
            console.log('ðŸ“ Drop at', x, y);
            
            setNodes(prevNodes => 
                prevNodes.map(n => 
                    n.id === draggedNode.id 
                        ? { ...n, position: { x, y } }
                        : n
                )
            );
            
            setDraggedNode(null);
        }, [draggedNode, zoom, panOffset]);
        
        const handleNodeDoubleClick = useCallback((node) => {
            console.log('ðŸ–±ï¸ Node double-clicked:', node.id);
            setSelectedNodeId(node.id);
            if (props.onNodeClick) {
                props.onNodeClick(node);
            }
        }, [props]);
        
        // CLICK-BASED CONNECTION: Click output handle, then click input handle
        const handleOutputClick = useCallback((e, node, handleId = null) => {
            e.stopPropagation();
            
            // Build connectingFrom string with handleId if provided
            const connectionId = handleId ? `${node.id}:${handleId}` : node.id;
            
            if (connectingFrom === connectionId) {
                // Clicked same handle - cancel
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
                console.log('âš ï¸ No connection in progress');
                return;
            }
            
            if (connectingFrom === targetNode.id) {
                console.log('âŒ Cannot connect to self');
                setConnectingFrom(null);
                return;
            }
            
            console.log('âœ… Connection complete:', connectingFrom, 'â†’', targetNode.id);
            
            // Parse connectingFrom which may be "nodeId" or "nodeId:handleId"
            const [sourceNodeId, sourceHandleId] = connectingFrom.includes(':') 
                ? connectingFrom.split(':') 
                : [connectingFrom, null];
            
            const newEdge = {
                id: `edge-${Date.now()}`,
                source: sourceNodeId,
                sourceHandle: sourceHandleId,  // Will be null for single-output nodes
                target: targetNode.id,
                type: 'smoothstep',
                animated: true
            };
            
            setEdges(prevEdges => {
                const updatedEdges = [...prevEdges, newEdge];
                
                // IMPORTANT: Notify admin.js that edges changed
                // If branch editor is open for target node, refresh it
                setTimeout(() => {
                    if (window.IntakeFlowBuilder && window.IntakeFlowBuilder.selectedNode) {
                        const selectedNode = window.IntakeFlowBuilder.selectedNode;
                        // If the target of this new connection is currently being edited, refresh the editor
                        if (selectedNode.id === targetNode.id && selectedNode.data.nodeType === 'branch') {
                            console.log('ðŸ”„ Refreshing branch editor with new connection');
                            window.IntakeFlowBuilder.selectNode(selectedNode);
                        }
                    }
                }, 50);
                
                return updatedEdges;
            });
            setConnectingFrom(null);
        }, [connectingFrom]);
        
        // Pan the canvas with mouse drag
        const handleCanvasMouseDown = useCallback((e) => {
            // Only pan if clicking the canvas background (not a node)
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
            }
        }, [isPanning, panStart]);
        
        const handleCanvasMouseUp = useCallback(() => {
            setIsPanning(false);
        }, []);
        
        // Zoom with mouse wheel
        const handleWheel = useCallback((e) => {
            e.preventDefault();
            const delta = e.deltaY * -0.001;
            const newZoom = Math.min(Math.max(0.1, zoom + delta), 3);
            setZoom(newZoom);
        }, [zoom]);
        
        // Cancel connection on canvas click
        const handleCanvasClick = useCallback((e) => {
            if (e.target.id === 'intakeflow-canvas' || e.target.classList.contains('canvas-background')) {
                if (connectingFrom) {
                    console.log('âŒ Connection cancelled (clicked canvas)');
                    setConnectingFrom(null);
                }
            }
        }, [connectingFrom]);
        
        // Expose API - Use useMemo to prevent unnecessary re-creation
        const apiInstance = useMemo(() => ({
            getFlow: () => {
                console.log('ðŸ“¤ getFlow() returning', nodes.length, 'nodes', edges.length, 'edges');
                return { nodes, edges };
            },
            setFlow: (flowData) => {
                console.log('ðŸ“¥ setFlow() received', flowData.nodes?.length || 0, 'nodes');
                if (flowData.nodes) {
                    setNodes([...flowData.nodes]); // Force new array reference
                }
                if (flowData.edges) {
                    setEdges([...flowData.edges]);
                }
            }
        }), [nodes, edges]);
        
        useEffect(() => {
            window.IntakeFlowReactInstance = apiInstance;
            console.log('âœ… IntakeFlowReactInstance API updated');
            
            return () => {
                delete window.IntakeFlowReactInstance;
            };
        }, [apiInstance]);
        
        // Sync with props
        useEffect(() => {
            if (props.initialNodes && props.initialNodes.length !== nodes.length) {
                console.log('ðŸ”„ Syncing from props:', props.initialNodes.length, 'nodes');
                setNodes(props.initialNodes);
            }
        }, [props.initialNodes]);
        
        // Force connection recalculation after nodes render (for dynamic sizing)
        useEffect(() => {
            // Wait for DOM to update, then trigger recalc
            const timer = setTimeout(() => {
                setUpdateTrigger(prev => prev + 1);
            }, 50);
            return () => clearTimeout(timer);
        }, [nodes, edges]);
        
        // console.log('🎨 Rendering canvas with', nodes.length, 'nodes and', edges.length, 'edges');
        
        // Helper function to get handle position (accounting for zoom and pan)
        const getHandlePosition = useCallback((node, side, handleId = null) => {
            const baseX = node.position.x * zoom + panOffset.x;
            const baseY = node.position.y * zoom + panOffset.y;
            
            // Try to get actual DOM dimensions
            const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
            let actualWidth, actualHeight;
            
            if (nodeElement) {
                const rect = nodeElement.getBoundingClientRect();
                actualWidth = rect.width;
                actualHeight = rect.height;
            } else {
                // Fallback to estimates
                const paddingX = 20 * zoom;
                const paddingY = 15 * zoom;
                const nodeContentWidth = 200 * zoom;
                actualWidth = nodeContentWidth + (paddingX * 2);
                const estimatedContentHeight = 35 * zoom;
                actualHeight = (paddingY * 2) + estimatedContentHeight;
            }
            
            if (side === 'bottom') {
                // For Branch nodes with multiple handles (output groups)
                if (node.data.nodeType === 'branch' && node.data.output_groups && node.data.output_groups.length > 0) {
                    // If handleId specified, find that specific handle
                    if (handleId) {
                        const groupIndex = node.data.output_groups.findIndex(group => group.id === handleId);
                        if (groupIndex !== -1) {
                            const totalGroups = node.data.output_groups.length;
                            const handleX = baseX + ((groupIndex + 1) / (totalGroups + 1)) * actualWidth;
                            
                            return {
                                x: handleX,
                                y: baseY + actualHeight
                            };
                        }
                    }
                    
                    // If no handleId or not found, use first handle position
                    const totalGroups = node.data.output_groups.length;
                    const handleX = baseX + (1 / (totalGroups + 1)) * actualWidth;
                    
                    return {
                        x: handleX,
                        y: baseY + actualHeight
                    };
                }
                
                // Default: centered bottom handle
                return {
                    x: baseX + (actualWidth / 2),
                    y: baseY + actualHeight
                };
            } else {
                // Input handle always centered on top
                return {
                    x: baseX + (actualWidth / 2),
                    y: baseY
                };
            }
        }, [zoom, panOffset, updateTrigger]);
        
        // Render connection lines (edges)
        const connectionLines = edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;
            
            
            const start = getHandlePosition(sourceNode, 'bottom', edge.sourceHandle);
            const end = getHandlePosition(targetNode, 'top');
            
            // Shorten the path by handle radius (6px) so arrow points to handle edge
            const handleRadius = 6;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const shortenFactor = (distance - handleRadius) / distance;
            
            const adjustedEndX = start.x + dx * shortenFactor;
            const adjustedEndY = start.y + dy * shortenFactor;
            
            // Simple curved path (vertical)
            const midY = (start.y + adjustedEndY) / 2;
            const path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${adjustedEndX} ${midY}, ${adjustedEndX} ${adjustedEndY}`;
            
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
                h('path', {
                    d: path,
                    stroke: '#2196f3',
                    strokeWidth: 2,
                    fill: 'none',
                    markerEnd: 'url(#arrowhead)'
                })
            ]);
        });
        
        // Render nodes with zoom and pan transform
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
                'data-node-id': node.id,  // For DOM lookups
                style: {
                    position: 'absolute',
                    left: (node.position.x * zoom + panOffset.x) + 'px',
                    top: (node.position.y * zoom + panOffset.y) + 'px',
                    padding: (15 * zoom) + 'px ' + (20 * zoom) + 'px',
                    borderRadius: (8 * zoom) + 'px',
                    border: `${2 * zoom}px solid ${color.border}`,
                    background: color.bg,
                    minWidth: (200 * zoom) + 'px',
                    cursor: 'move',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                    transform: `scale(${isSelected ? 1.02 : 1})`,
                    transition: 'all 0.2s',
                    zIndex: isSelected ? 10 : 1,
                    fontSize: (13 * zoom) + 'px'
                },
                draggable: true,
                onDragStart: (e) => handleDragStart(e, node),
                onDoubleClick: () => handleNodeDoubleClick(node)
            }, [
                // Delete button (top-right corner, shows on hover)
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
                        zIndex: 20
                    },
                    onClick: (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this node?')) {
                            // Call admin.js delete function
                            if (window.IntakeFlowBuilder) {
                                window.IntakeFlowBuilder.selectedNode = node;
                                window.IntakeFlowBuilder.deleteNode();
                            }
                        }
                    },
                    onMouseEnter: (e) => {
                        e.target.style.opacity = '1';
                    },
                    title: 'Delete node'
                }, '×'),
                
                // Input handle (top) - CLICK to complete connection
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
                        zIndex: 10
                    },
                    onClick: (e) => handleInputClick(e, node),
                    title: connectingFrom ? 'Click to complete connection' : 'Input'
                }),
                
                // Output handles - dynamic based on node type
                ...(function() {
                    const nodeType = node.data.nodeType;
                    
                    // Branch nodes: one handle per output group (bottom horizontal)
                    if (nodeType === 'branch' && node.data.output_groups && node.data.output_groups.length > 0) {
                        return node.data.output_groups.map((group, index) => {
                            const totalGroups = node.data.output_groups.length;
                            const handleLeft = ((index + 1) / (totalGroups + 1)) * 100; // Distribute evenly horizontally
                            const isThisHandleConnecting = connectingFrom === node.id + ':' + group.id;
                            
                            // Create tooltip from group conditions
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
                                    boxShadow: isThisHandleConnecting ? '0 0 0 4px rgba(255,152,0,0.3)' : 'none'
                                },
                                onClick: (e) => {
                                    e.stopPropagation();
                                    handleOutputClick(e, node, group.id);
                                },
                                title: tooltip || group.label
                            });
                        });
                    }
                    
                    // All other nodes: single centered output handle (bottom)
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
                            boxShadow: isConnecting ? '0 0 0 4px rgba(255,152,0,0.3)' : 'none'
                        },
                        onClick: (e) => handleOutputClick(e, node),
                        title: isConnecting ? 'Click again to cancel' : 'Click to start connection'
                    })];
                })(),
                
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
            ]);
        });
        
        // Canvas container with pan and zoom
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
            // SVG definitions for arrowheads
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
            
            // Connection lines
            ...connectionLines,
            
            // Canvas controls (zoom, reset)
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
            
            // Node counter and connection status
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
                }, 'ðŸ”— Click input to connect') : null
            ]),
            
            // Zoom indicator
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
            
            // Render all nodes
            ...nodeElements,
            
            // Empty state
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
                h('div', { key: 'icon', style: { fontSize: '48px', marginBottom: '10px' } }, '-'),
                h('div', { key: 'text' }, 'Click "Add Node" buttons above to start building your flow')
            ]) : null
        ]);
    }
    
    // Expose globally with a different name to avoid conflicts
    window.IntakeFlowCanvasComponent = FlowCanvas;
    console.log('âœ…âœ…âœ… IntakeFlow Canvas ready! âœ…âœ…âœ…');
    
})();
