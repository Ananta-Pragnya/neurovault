from queue import PriorityQueue

class GraphWrapper:
    def __init__(self, graph_data):
        self.edges = graph_data.get('edges', [])
        self.out_edges = {}
        for edge in self.edges:
            src = edge['from']
            if src not in self.out_edges:
                self.out_edges[src] = []
            self.out_edges[src].append(edge)

    def get_out_edges(self, node):
        return self.out_edges.get(node, [])

def propagate_shock(start_node: str, severity: float, graph_data: dict, max_depth=3):
    """
    Traverse influence graph, compute cascading impacts
    
    Returns: {ticker: impact_score} for all affected assets
    """
    
    graph = GraphWrapper(graph_data)
    impacts = {}
    
    # Priority Queue stores (-impact, node, impact, depth) to process highest impact first
    pq = PriorityQueue()
    pq.put((-severity, start_node, severity, 0))
    
    visited = set()
    
    while not pq.empty():
        _, node, impact, depth = pq.get()
        
        # If we found a stronger path to this node, update it. 
        # But if we've already processed this node with higher impact, skip.
        if node in impacts and impacts[node] >= impact:
            continue
        
        impacts[node] = impact
        
        if depth >= max_depth:
            continue
            
        for edge in graph.get_out_edges(node):
            # Weight is the coefficient. 
            # Child impact = parent impact * weight
            child_impact = impact * abs(edge['weight'])
            
            # Filter negligible impacts
            if child_impact >= 0.05:  # min_impact_threshold
                pq.put((-child_impact, edge['to'], child_impact, depth + 1))
    
    return impacts
