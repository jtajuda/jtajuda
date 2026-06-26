// Extrai "Cidade/UF" do endereço salvo
// Formato salvo: "Rua X, 123, Bairro, Cidade/UF, CEP 00000-000"
export function extractCidadeEstado(endereco) {
  if (!endereco) return ''
  // Tenta pegar o padrão Cidade/UF
  const match = endereco.match(/([^,]+\/[A-Z]{2})/)
  if (match) return match[1].trim()
  // Fallback: pega o penúltimo segmento
  const parts = endereco.split(',')
  if (parts.length >= 3) return parts[parts.length - 2].trim()
  return endereco.split(',').pop().trim()
}
