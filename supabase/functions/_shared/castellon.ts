// AUTOGERADO — municipios de la provincia de Castellón (código INE 12xxx).
// Se usa para enrutar leads al CRM Castellón.

const MUNICIPIOS_CASTELLON: string[] = ["albocasser","alcala de xivert","alcudia de veo","alfondeguilla","algimia de almonacid","almassora","almedijar","almenara","alquerias del nino perdido","altura","aranuel","ares del maestrat","argelita","artana","atzeneta del maestrat","ayodar","azuebar","barracas","bejis","benafer","benafigos","benassal","benicarlo","benicasim","benicassim","benlloc","betxi","borriana","borriol","burriana","cabanes","calig","canet lo roig","castell de cabres","castellfort","castellnovo","castello","castello de la plana","castellon","castellon de la plana","castillo de villamalefa","cati","caudiel","cervera del maestre","chilches","chodos","chovar","cinctorres","cirat","cortes de arenoso","costur","culla","el toro","eslida","espadilla","fanzara","figueroles","forcall","fuente la reina","fuentes de ayodar","gaibiel","geldo","herbes","higueras","jerica","l alcora","la jana","la llosa","la mata de morella","la pobla de benifassa","la pobla tornesa","la salzadella","la serratella","la torre d en besora","la torre d en domenec","la vall d uixo","la vilavella","les alqueries","les coves de vinroma","les useres","llucena","lucena del cid","ludiente","matet","moncofa","montan","montanejos","morella","navajas","nules","olocau del rey","onda","oropesa del mar","orpesa","palanques","pavias","peniscola","pina de montalgrao","portell de morella","puebla de arenoso","ribesalbes","rossell","sacanet","san jorge","san rafael del rio","sant joan de moro","sant jordi","sant mateu","santa magdalena de pulpis","segorbe","sierra engarceran","soneja","sot de ferrer","suera","sueras","tales","teresa","tirig","todolella","toga","toras","torralba del pinar","torreblanca","torrechiva","traiguera","useras","vall d alba","vall de almonacid","vallat","vallibona","vila real","vilafames","vilafranca","vilanova d alcolea","vilar de canes","villafranca del cid","villahermosa del rio","villamalur","villanueva de viver","villores","vinaros","vistabella del maestrat","viver","xert","xilxes","xodos","zorita del maestrazgo","zucaina"];

const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** true si el texto de zona/ciudad corresponde a la provincia de Castellón */
export const esZonaCastellon = (...textos: (string | null | undefined)[]): boolean => {
  const texto = ' ' + normalizar(textos.filter(Boolean).join(' ')) + ' ';
  if (texto.trim().length === 0) return false;
  return MUNICIPIOS_CASTELLON.some((m) => texto.includes(' ' + m + ' '));
};

export { MUNICIPIOS_CASTELLON };
