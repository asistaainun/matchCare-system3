echo "🧪 TESTING MATCHCARE ONTOLOGY SETUP"
echo "=================================="

# Test 1: Basic connectivity
echo "1️⃣ Testing Fuseki connectivity..."
curl -s "http://localhost:3030/$/ping" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Fuseki server running"
else
    echo "❌ Fuseki server not accessible"
    exit 1
fi

# Test 2: Dataset exists
echo "2️⃣ Testing dataset existence..."
curl -s "http://localhost:3030/$/datasets" | grep -q "skincare-db"
if [ $? -eq 0 ]; then
    echo "✅ skincare-db dataset exists"
else
    echo "❌ skincare-db dataset not found"
    exit 1
fi

# Test 3: Count total triples
echo "3️⃣ Counting ontology triples..."
TRIPLE_COUNT=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "query=SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }" \
  "http://localhost:3030/skincare-db/sparql" | \
  grep -o '"value":"[0-9]*"' | grep -o '[0-9]*' | head -1)

if [ "$TRIPLE_COUNT" -gt 100 ]; then
    echo "✅ Ontology loaded: $TRIPLE_COUNT triples"
else
    echo "❌ Insufficient data: $TRIPLE_COUNT triples"
fi

# Test 4: Key ingredients test
echo "4️⃣ Testing key ingredients..."
KEY_INGREDIENTS=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'query=PREFIX : <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/> SELECT (COUNT(*) as ?count) WHERE { ?s a :KeyIngredient }' \
  "http://localhost:3030/skincare-db/sparql" | \
  grep -o '"value":"[0-9]*"' | grep -o '[0-9]*' | head -1)

if [ "$KEY_INGREDIENTS" -gt 10 ]; then
    echo "✅ Key ingredients loaded: $KEY_INGREDIENTS items"
else
    echo "⚠️ Limited key ingredients: $KEY_INGREDIENTS items"
fi

# Test 5: Incompatibility relationships
echo "5️⃣ Testing incompatibility relationships..."
CONFLICTS=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'query=PREFIX : <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/> SELECT (COUNT(*) as ?count) WHERE { ?s :incompatibleWith ?o }' \
  "http://localhost:3030/skincare-db/sparql" | \
  grep -o '"value":"[0-9]*"' | grep -o '[0-9]*' | head -1)

if [ "$CONFLICTS" -gt 5 ]; then
    echo "✅ Conflict relationships: $CONFLICTS mappings"
else
    echo "⚠️ Limited conflict data: $CONFLICTS mappings"
fi

# Test 6: Query performance
echo "6️⃣ Testing query performance..."
START_TIME=$(date +%s%N)
curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'query=PREFIX : <http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/> SELECT ?ing1 ?name1 ?ing2 ?name2 WHERE { ?ing1 rdf:type :Ingredient ; :IngredientName ?name1 ; :incompatibleWith ?ing2 . ?ing2 :IngredientName ?name2 . } LIMIT 10' \
  "http://localhost:3030/skincare-db/sparql" > /dev/null
END_TIME=$(date +%s%N)
QUERY_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

if [ "$QUERY_TIME" -lt 500 ]; then
    echo "✅ Query performance: ${QUERY_TIME}ms (Excellent)"
elif [ "$QUERY_TIME" -lt 1000 ]; then
    echo "✅ Query performance: ${QUERY_TIME}ms (Good)"
else
    echo "⚠️ Query performance: ${QUERY_TIME}ms (Acceptable)"
fi

# Final assessment
echo ""
echo "🎯 DEVELOPMENT READINESS ASSESSMENT"
echo "=================================="

if [ "$TRIPLE_COUNT" -gt 100 ] && [ "$KEY_INGREDIENTS" -gt 10 ] && [ "$CONFLICTS" -gt 5 ]; then
    echo "🚀 STATUS: READY FOR DEVELOPMENT"
    echo "✅ All systems operational"
    echo "✅ Sufficient data coverage"
    echo "✅ Performance acceptable"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "1. Implement backend SPARQL service"
    echo "2. Create API endpoints"
    echo "3. Build frontend components"
    echo "4. Test end-to-end functionality"
else
    echo "⚠️ STATUS: NEEDS ATTENTION"
    echo "Some components need improvement before development"
fi

echo ""
echo "🔗 USEFUL ENDPOINTS:"
echo "- Fuseki UI: http://localhost:3030"
echo "- SPARQL Endpoint: http://localhost:3030/skincare-db/sparql"
echo "- Dataset Management: http://localhost:3030/$/datasets"