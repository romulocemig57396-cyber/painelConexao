// A rede da Cemig intercepta HTTPS (proxy/firewall trocando o certificado
// pelo de uma CA interna). O Windows já confia nela via política de domínio
// (por isso git/Chrome nunca reclamaram), mas o fetch() do Node usa sua
// própria lista de certificados, sem essa CA — daí o
// "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" ao chamar o Portal Conexão MT.
//
// win-ca lê a store de certificados confiáveis do Windows e, com
// inject('+'), faz tls.createSecureContext() usar essas CAs além das
// embutidas no Node — cobre fetch()/undici, não só o módulo https antigo.
// Em qualquer outro SO (Linux/Mac) o pacote não faz nada, então isso é
// seguro de rodar sempre, sem checar plataforma.
try {
  require('win-ca').inject('+');
} catch (err) {
  console.warn('Não foi possível carregar os certificados confiáveis do Windows:', err.message);
}

module.exports = {};
