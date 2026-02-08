/**
 * Mapping des noms d'établissements suisses vers leurs domaines email.
 * Chaque entrée : [motifs de recherche (lowercase), domaine email]
 * Le matching est partiel : si le nom de l'établissement contient un des motifs, le domaine est utilisé.
 * Les entrées sont ordonnées du plus spécifique au plus générique pour éviter les faux positifs.
 */

const HOSPITAL_DOMAINS = [
  // === HÔPITAUX UNIVERSITAIRES ===
  [['chuv', 'centre hospitalier universitaire vaudois'], 'chuv.ch'],
  [['hug', 'hôpitaux universitaires de genève', 'hôpitaux universitaires genève'], 'hug.ch'],
  [['inselspital', 'insel gruppe'], 'insel.ch'],
  [['usz', 'universitätsspital zürich'], 'usz.ch'],
  [['usb', 'universitätsspital basel', 'unispital basel'], 'usb.ch'],
  [['ukbb', 'universitäts-kinderspital beider basel', 'universität-kinderspital beider basel'], 'ukbb.ch'],
  [['kinderspital zürich', 'universitäts-kinderspital zürich'], 'kispi.uzh.ch'],
  [['balgrist', 'universitätsklinik balgrist', 'orthopädische universitätsklinik balgrist'], 'balgrist.ch'],

  // === HÔPITAUX CANTONAUX — Suisse alémanique ===
  [['hoch', 'kantonsspital st. gallen', 'kssg', 'spital linth', 'spital wil', 'spital altstätten', 'spital grabs'], 'kssg.ch'],
  [['kantonsspital aarau', 'ksa'], 'ksa.ch'],
  [['kantonsspital baden', 'ksb'], 'ksb.ch'],
  [['kantonsspital winterthur', 'ksw'], 'ksw.ch'],
  [['kantonsspital graubünden', 'ksgr', 'spital walenstadt ksgr'], 'ksgr.ch'],
  [['luzerner kantonsspital', 'luks'], 'luks.ch'],
  [['kantonsspital baselland', 'ksbl'], 'ksbl.ch'],
  [['kantonsspital glarus', 'ksgl'], 'ksgl.ch'],
  [['kantonsspital obwalden', 'ksow'], 'ksow.ch'],
  [['kantonsspital uri', 'ksu'], 'ksuri.ch'],
  [['zuger kantonsspital', 'zgks'], 'zgks.ch'],
  [['spital schwyz'], 'spital-schwyz.ch'],
  [['spital nidwalden'], 'spital-nidwalden.ch'],
  [['spitäler schaffhausen', 'kantonsspital schaffhausen'], 'spitaeler-sh.ch'],
  [['spital thurgau', 'kantonsspital frauenfeld', 'kantonsspital münsterlingen', 'stgag'], 'stgag.ch'],
  [['solothurner spitäler', 'bürgerspital solothurn', 'kantonsspital olten', 'spital dornach'], 'spital.so.ch'],
  [['spitalverbund appenzell'], 'spitalverbund.ch'],

  // === HÔPITAUX CANTONAUX — Suisse romande et Tessin ===
  [['hfr', 'hôpital fribourgeois', 'freiburger spital'], 'h-fr.ch'],
  [['hôpital du valais', 'spital wallis', 'rsv', 'spitalzentrum oberwallis', 'institut central des hôpitaux valaisan', 'hôpital de sion'], 'hopitalvs.ch'],
  [['rhne', 'réseau hospitalier neuchâtelois', 'réseau hospitalier neuchâteloise'], 'rhne.ch'],
  [['hôpital du jura', 'h-ju'], 'h-ju.ch'],
  [['eoc', 'ente ospedaliero cantonale', 'ospedale regionale di bellinzona', 'ospedale regionale di locarno', 'ospedale regionale di lugano', 'ospedale regionale di mendrisio', 'cardiocentro ticino', 'istituto cantonale di patologia', 'istituto pediatrico della svizzera italiana'], 'eoc.ch'],
  [['ehnv', 'etablissements hospitaliers du nord vaudois', 'hôpital orbe', 'hôpital saint-loup'], 'ehnv.ch'],

  // === GRANDS HÔPITAUX RÉGIONAUX ===
  [['stadtspital zürich', 'stadtspital zürich triemli', 'stadtspital zürich waid'], 'stadtspital.ch'],
  [['spital limmattal'], 'spital-limmattal.ch'],
  [['spital bülach'], 'spitalbuelach.ch'],
  [['spital uster'], 'spitaluster.ch'],
  [['spital männedorf'], 'spitalmaennedorf.ch'],
  [['spital zollikerberg'], 'spitalzollikerberg.ch'],
  [['see-spital', 'seespital horgen'], 'see-spital.ch'],
  [['gzo', 'spital wetzikon'], 'gzo.ch'],
  [['spital sts', 'spital thun', 'spital zweisimmen', 'spitalsts'], 'spitalstsag.ch'],
  [['spital emmental', 'spital burgdorf', 'spital langnau'], 'spital-emmental.ch'],
  [['spitalzentrum biel', 'centre hospitalier bienne'], 'szb-chb.ch'],
  [['hôpital riviera-chablais', 'riviera-chablais'], 'hopitalrivierachablais.ch'],
  [['ehc', 'ensemble hospitalier de la côte', 'hôpital de morges', 'hôpital de gilly'], 'ehc-vd.ch'],
  [['hôpital intercantonal de la broye', 'hib'], 'hopital-broye.ch'],
  [['ghol', 'hôpital de nyon', 'groupement hospitalier de l\'ouest lémanique'], 'ghol.ch'],
  [['lindenhofspital', 'sonnenhofspital', 'lindenhof'], 'lindenhofgruppe.ch'],
  [['st. claraspital', 'st. clara'], 'claraspital.ch'],
  [['spital muri'], 'spital-muri.ch'],
  [['spital affoltern'], 'spitalaffoltern.ch'],
  [['spital lachen'], 'spital-lachen.ch'],
  [['spital davos'], 'spitaldavos.ch'],
  [['spital oberengadin'], 'spital-oberengadin.ch'],
  [['spital thusis'], 'spitalthusis.ch'],
  [['spital zofingen'], 'spitalzofingen.ch'],
  [['regionalspital surselva'], 'spitalsurselva.ch'],
  [['gesundheitszentrum fricktal', 'gzf'], 'gzf.ch'],
  [['spital herisau'], 'spitalverbund.ch'],
  [['asana spital'], 'asana.ch'],
  [['spitäler fmi', 'spital frutigen', 'spital interlaken'], 'spitalfmi.ch'],
  [['sro', 'spital region oberaargau', 'spital langenthal'], 'sro.ch'],
  [['bethesda-spital', 'bethesda spital'], 'bethesda.ch'],
  [['hôpital de la tour'], 'latour.ch'],
  [['hôpital de la providence'], 'hopital-providence.ch'],
  [['hôpital de lavaux'], 'hopitaldelavaux.ch'],
  [['clinique des grangettes'], 'gfrg.ch'],
  [['hôpital des enfants', 'hôpital de l\'enfance'], 'hug.ch'],
  [['felix platter'], 'felixplatter.ch'],
  [['adullam-spital', 'adullam spital'], 'adullam.ch'],
  [['liechtensteinisches landesspital'], 'landesspital.li'],
  [['center da sandà engiadina bassa', 'gesundheitszentrum unterengadin'], 'cseb.ch'],
  [['hôpital du jura bernois', 'hôpital de moutier'], 'hjbe.ch'],
  [['kinderspital luzern'], 'luks.ch'],
  [['ostschweizer kinderspital'], 'kispisg.ch'],

  // === PSYCHIATRIE ===
  [['psychiatrische universitätsklinik zürich', 'puk zürich', 'pukzh'], 'pukzh.ch'],
  [['upk', 'universitäre psychiatrische kliniken basel', 'universitäre psychiatrische kliniken upk'], 'upk.ch'],
  [['upd', 'universitäre psychiatrische dienste bern', 'universitäre psychiatrische dienste'], 'upd.ch'],
  [['pdag', 'psychiatrische dienste aargau'], 'pdag.ch'],
  [['psychiatrie baselland', 'pbl'], 'pbl.ch'],
  [['pdgr', 'psychiatrische dienste graubünden'], 'pdgr.ch'],
  [['ipw', 'integrierte psychiatrie winterthur'], 'ipw.ch'],
  [['pzm', 'psychiatriezentrum münsingen'], 'pzmag.ch'],
  [['psychiatrie st. gallen', 'psychiatrische dienste st. gallen'], 'psychiatrie-sg.ch'],
  [['luzerner psychiatrie'], 'lups.ch'],
  [['clienia'], 'clienia.ch'],
  [['sanatorium kilchberg'], 'sanatorium-kilchberg.ch'],
  [['privatklinik meiringen'], 'privatklinik-meiringen.ch'],
  [['privatklinik hohenegg'], 'hohenegg.ch'],
  [['privatklinik wyss'], 'privatklinikwyss.ch'],
  [['forel-klinik', 'forel klinik'], 'forel-klinik.ch'],
  [['klinik sonnenhalde'], 'sonnenhalde.ch'],
  [['klinik meissenberg'], 'meissenberg.ch'],
  [['klinik südhang'], 'suedhang.ch'],
  [['rfsm', 'réseau fribourgeois de santé mentale'], 'rfsm.ch'],
  [['cnp', 'centre neuchâtelois de psychiatrie'], 'cnp.ch'],
  [['institutions universitaires de psychiatrie'], 'hug.ch'],
  [['psychiatrisches zentrum appenzell'], 'gfrb.ch'],
  [['psychiatrische dienste thurgau'], 'stgag.ch'],
  [['psychiatrischen dienste glarus', 'pdgl'], 'pdgl.ch'],
  [['klinik zugersee', 'triaplus'], 'triaplus.ch'],
  [['ambulante psychiatrie und psychotherapie schwyz'], 'triaplus.ch'],
  [['ambulante psychiatrie und psychotherapie uri'], 'triaplus.ch'],
  [['ambulante psychiatrie und psychotherapie zug'], 'triaplus.ch'],

  // === RÉHABILITATION ===
  [['schweizer paraplegikerzentrum', 'paraplegiker', 'spz nottwil'], 'paraplegie.ch'],
  [['rehab basel'], 'rehab.ch'],
  [['rehaklinik bellikon', 'rehabellikon'], 'rehabellikon.ch'],
  [['kliniken valens'], 'kliniken-valens.ch'],
  [['klinik barmelweid'], 'barmelweid.ch'],
  [['berner klinik montana'], 'bernerklinik.ch'],
  [['berner reha zentrum', 'heiligenschwendi'], 'rehabern.ch'],
  [['clinique romande de réadaptation'], 'crr-suva.ch'],
  [['rehaklinik zihlschlacht'], 'rehaklinik-zihlschlacht.ch'],
  [['rehaklinik hasliberg'], 'rehaklinik-hasliberg.ch'],
  [['rehaklinik dussnang'], 'rehaklinik-dussnang.ch'],
  [['rehaklinik seewis'], 'rehaklinik-seewis.ch'],
  [['rehaklinik tschugg'], 'rehaklinik-tschugg.ch'],
  [['luzerner höhenklinik montana'], 'luks.ch'],
  [['hochgebirgsklinik davos'], 'hgk.ch'],
  [['klinik adelheid'], 'klinik-adelheid.ch'],
  [['rheinburg-klinik'], 'rheinburg.ch'],

  // === GROUPES PRIVÉS — Hirslanden ===
  [['hirslanden'], 'hirslanden.ch'],

  // === GROUPES PRIVÉS — Swiss Medical Network / autres ===
  [['clinique de genolier', 'genolier'], 'genolier.net'],
  [['clinique la source', 'centre médical de la source'], 'lasource.ch'],
  [['schulthess klinik'], 'kws.ch'],
  [['berit klinik'], 'beritklinik.ch'],
  [['clinique la colline'], 'lacolline.ch'],
  [['clinique générale beaulieu'], 'beaulieu.ch'],
  [['hôpital régional rolle'], 'hopitalrivegeneve.ch'],
  [['clinique de valère'], 'clinique-valere.ch'],
  [['clinique le noirmont'], 'clinique-le-noirmont.ch'],
  [['clinique la lignière'], 'ligniere.ch'],
  [['clinique belmont'], 'cliniquebelmont.ch'],
  [['klinik gut'], 'klinik-gut.ch'],
  [['klinik gais'], 'klinik-gais.ch'],
  [['vista klinik', 'vista alpina'], 'vistaklinik.ch'],
  [['pallas klinik'], 'pallas-kliniken.ch'],
  [['salem-spital', 'salem spital'], 'lindenhofgruppe.ch'],
  [['klinik arlesheim'], 'klinik-arlesheim.ch'],
  [['klinik lengg'], 'kliniklengg.ch'],
  [['klinik im hasel'], 'klinikimhasel.ch'],
  [['klinik schützen rheinfelden'], 'klinikschuetzen.ch'],
  [['ameos'], 'ameos.ch'],

  // === DIVERS ===
  [['geriatrische klinik st. gallen'], 'geriatrie-sg.ch'],
  [['alterspsychiatrischer dienst der stadt zürich'], 'stadtspital.ch'],
  [['spital aarberg', 'spital riggisberg'], 'insel.ch'],
  [['spital schiers'], 'spitalschiers.ch'],
  [['klinik st. katharinental'], 'stgag.ch'],
  [['klinik siloah'], 'siloah.ch'],
  [['klinik susenberg'], 'susenberg.ch'],
  [['klinik wald'], 'zhreha.ch'],
  [['klinik birshof'], 'birshof.ch'],
  [['klinik hohmad'], 'hohmad.ch'],
  [['klinik teufen'], 'klinikteufen.ch'],
  [['klinik sarnen'], 'kliniksarnen.ch'],
  [['privatklinik aadorf'], 'klinik-aadorf.ch'],
  [['privatklinik oberwaid'], 'oberwaid.ch'],
  [['kinderklinik wildermeth'], 'szb-chb.ch'],
  [['clinique bois-bougy'], 'bois-bougy.ch'],
  [['clinique rive gauche'], 'rivegauche.ch'],
  [['clinique du grand-salève'], 'grandsaleve.ch'],
  [['hôpital de lavaux'], 'hopitaldelavaux.ch'],
  [['centre hospitalier yverdon chamblon'], 'ehnv.ch'],
  [['rehazentrum wolhusen'], 'luks.ch'],
  [['rehazentrum st. gallen'], 'kliniken-valens.ch'],
  [['cité générations'], 'cite-generations.ch'],
  [['médicentre psychiatrie biel'], 'szb-chb.ch'],
  [['plaza kliniken'], 'plazakliniken.ch'],
];

/**
 * Cherche le domaine email correspondant au nom d'un établissement.
 * Matching partiel insensible à la casse.
 * @param {string} name - Nom de l'établissement
 * @returns {string|null} - Domaine email ou null
 */
export function findDomain(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [patterns, domain] of HOSPITAL_DOMAINS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        return domain;
      }
    }
  }
  return null;
}

export default HOSPITAL_DOMAINS;
