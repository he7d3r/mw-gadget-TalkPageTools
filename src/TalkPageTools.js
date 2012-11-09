/*
 * Altera a formatação dos tópicos das páginas de discussão, ocultando aqueles que não recebem novos comentários há alguns dias
 * @author: [[User:Helder.wiki]]
 * @source: [[Special:GlobalUsage/User:Helder.wiki/Tools/TalkPageTools.js]] ([[File:User:Helder.wiki/Tools/TalkPageTools.js]])
 */
/*jslint browser: true, white: true, devel: true, todo: true */
/*global mediaWiki, jQuery*/
( function ( mw, $ ) {
'use strict';

if ( mw.config.get( 'wgDBname' ) === 'ptwiki' ){
	window.tpt = {
		extraTalkPages: [
			'Wikipédia:Café_dos_administradores', 'Wikipédia:Esplanada/propostas',
			'Wikipédia:Esplanada/geral', 'Wikipédia:Fusão/Central_de_fusões',
			'Wikipédia:Fontes_fiáveis/Central_de_fiabilidade'
		]
	};
}

var tpt = {
	collapseTopics: true,
	// TODO: Make sure this works as expected on multi level talk pages, when level != 2
	level: 2, // == <h2> Headings ==
	maxDays: $.cookie( mw.config.get('wgCookiePrefix') + 'tpt-maxDays' ) || 7,
	extraTalkPages: [],
	monthNames: {
		'en': [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
		'pt': [ 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro' ]
	},
	reTimeStamp: {
		'en': /(\d{1,2}):(\d{1,2}), (\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4}) \(UTC\)/gi,
		'pt': /(\d{1,2})h(\d{1,2})min de (\d{1,2}) de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4}) \(UTC\)/gi
	},
	dateOrder: {
		// Change this for languages where the parts of the timestamps are in a different order
		// 'lang': { hours: #, minutes: #, day: #, month: #, year: # }
	},
	i18n: {
		'en': {
			'tpt-old-topic-text': 'This topic was last edited $1 days ago. Click on the section header to toggle the comments.',
			'tpt-unsigned-topic-text': 'All comments on this topic are unsigned.'
		},
		'pt': {
			'tpt-old-topic-text': 'Este tópico foi editado pela última vez há $1 dias. Clique no título da seção para exibir ou ocultar os comentários.',
			'tpt-unsigned-topic-text': 'Todos os comentários deste tópico estão sem assinatura.'
		}
	}
};

tpt.timeDistanceInDays = function ( d1, d2 ){
	var diff = Math.floor( ( d1.getTime() - d2.getTime() ) / 86400000 ); // = 1000*60*60*24
	return diff;
};

tpt.getDates = function ( text ){
	var	lang = mw.config.get( 'wgContentLanguage' ),
		monthNames = tpt.monthNames[ lang ] || tpt.monthNames.en,
		reTimeStamp = tpt.reTimeStamp[ lang ] || tpt.reTimeStamp.en,
		defaultOrder = { hours: 1, minutes: 2, day: 3, month: 4, year: 5 },
		dateOrder = tpt.dateOrder[ lang ] || defaultOrder,
		match, date, dates = [];
	match = reTimeStamp.exec( text );
	while ( match ){
		date = new Date();
		date.setUTCFullYear(
			match[ dateOrder.year],
			$.inArray( match[ dateOrder.month ], monthNames ),
			match[ dateOrder.day ]
		);
		date.setUTCHours(
			match[ dateOrder.hours ],
			match[ dateOrder.minutes ],
			0, // seconds
			0 // miliseconds
		);
		dates.push( date );
		match = reTimeStamp.exec( text );
	}
	return dates;
};

tpt.formatTalkPage = function () {
	var	level = tpt.level,
		dates,
		today = new Date();

	mw.util.addCSS([
		//'.topic h2.mw-collapsible-toggle {float:none; cursor: pointer; text-align: left;} ',
		//'.topic:hover {background-color: #FFE;} ',
		'div.ongoing-discussion {background-color:#FFF;} ',
		'.topic {background-color:#EEE;}'
	].join('\n'));
	$('#mw-content-text').find('h2' ).filter(function(){
		var $this = $(this);
		return !$this.parent().is('#toctitle')
				&& $this.attr('id') !== 'mw-previewheader'
				&& !$this.hasClass( 'diff-currentversion-title' );
	}).each(function(){
		var $this = $(this);
		if ( tpt.collapseTopics ){
			// Based on code from http://stackoverflow.com/a/7968463
			$this.addClass('mw-collapsible-toggle')
				// mw.util.addCSS is too slow!
				.css({
					float: 'none';
					cursor: 'pointer',
					text-align: 'left'
				})
				.nextUntil('h' + level).wrapAll('<div class="mw-collapsible-content" />').parent().add( $this )
				.andSelf().wrapAll('<div class="topic mw-collapsible" />');
		} else {
			$this.nextUntil('h' + level).andSelf().wrapAll('<div class="topic" />');
		}
	});
	$('.topic').each(function(){
		var $this = $(this), days;

		dates = tpt.getDates( $this.text() );
		if ( dates.length === 0 ) {
			// This top was not signed by anyone
			// TODO: maybe add a visible warning or change the color?
			$this.find('h2').after( '<i class="error" style="margin-bottom: 2em; display: block;">' + mw.msg( 'tpt-unsigned-topic-text' ) + '</i>' );
			return true;
		}
		dates.sort( function(a,b){return b-a;} ); // Descending order
		days = tpt.timeDistanceInDays( today, dates[0] );
		if ( days < tpt.maxDays ) {
			$this.addClass( 'ongoing-discussion' );
		} else if ( tpt.collapseTopics ){
			$this.find('h2').after( '<i style="margin-bottom: 2em; display: block;">' + mw.msg( 'tpt-old-topic-text', days ) + '</i>' );
			$this.addClass( 'mw-collapsed' );
		}
	});

	$( '.mw-collapsible' ).makeCollapsible();
};

tpt.run = function(){
	if( $('#ca-addsection').length > 0 || $.inArray( mw.config.get( 'wgPageName' ), tpt.extraTalkPages) !== -1 ) {
		var int = tpt.i18n.en;

		// Define language fallbacks
		tpt.i18n['pt-br'] = tpt.i18n.pt;

		// Replace default English interface by translation if available
		$.extend( true, int, tpt.i18n[ mw.config.get( 'wgUserLanguage' ) ] );

		// Define interface messages
		mw.messages.set( int );
		mw.loader.using( ['mediawiki.util', 'jquery.makeCollapsible'], tpt.formatTalkPage );
	}
};
tpt.addLink = function(){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		'Tempo de duração dos tópicos',
		'#ca-tpt-max-days',
		'Alterar o número de dias durante os quais os tópicos ficam exibidos por padrão'
	) ).click( function (e) {
		e.preventDefault(); // prevent '#' from appearing in URL bar
		$.cookie(
			mw.config.get('wgCookiePrefix') + 'tpt-maxDays',
			prompt( 'Deseja ocultar automaticamente os tópicos cuja última edição ocorreu há mais de quantos dias?', '7' ) || 7,
			{
				expires: 1,
				path: '/'
			}
		);
		document.location.reload( false ); // Reloads the document (from the cache)
	} );
};

if( window.tpt === undefined ){
	window.tpt = tpt;
} else if ( typeof window.tpt === 'object' ){
	window.tpt = $.extend({}, tpt, window.tpt);
}

if( $.inArray( mw.config.get('wgAction'), [ 'view', 'purge' ]) !== -1 ){
	$( tpt.run );
	$( tpt.addLink );
}

}( mediaWiki, jQuery) );