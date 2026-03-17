/**
 * HeartBound IQ — Virtual Card Agent
 * Delegates to WeddingCardGenerator (10 designs)
 */
const cardGen = require('./weddingCardGenerator');

class VirtualCardAgent {
  async generate(details, designIndex = 1) {
    try {
      const html = await cardGen.generate(details, designIndex || details.designIndex || 1);
      return { success: true, html };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new VirtualCardAgent();

