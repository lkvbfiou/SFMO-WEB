// js/main.js
$(function() {
  // 1) Hero image fade-in on load
  $('.slider img')
    .css({ opacity: 0 })
    .animate({ opacity: 1 }, 2000);

  // 2) Smooth-scroll for any anchor links
  $('a[href^="#"], .site-nav a').on('click', function(e) {
    var href = $(this).attr('href');
    if (href.startsWith('#') && $(href).length) {
      e.preventDefault();
      $('html, body').animate(
        { scrollTop: $(href).offset().top },
        800
      );
    }
  });

  // 3) Fade sections in when they enter viewport
  var $sections = $('header.wrapper, .box1, .box2, .box3, footer');
  $sections.css('opacity', 0);
  function revealSections() {
    var scrollTop = $(window).scrollTop(),
        winH = $(window).height();
    $sections.each(function() {
      var $sec = $(this),
          top = $sec.offset().top;
      if (top < scrollTop + winH - 100 && !$sec.data('revealed')) {
        $sec
          .data('revealed', true)
          .animate({ opacity: 1 }, 800);
      }
    });
  }
  $(window).on('scroll resize', revealSections);
  revealSections(); // trigger on load

  // 4) Featured-listing hover zoom
  $('.box1 .inner li').css({ overflow: 'hidden' });
  $('.box1 .inner li').hover(
    function() {
      $(this)
        .find('img')
        .stop(true)
        .animate(
          { width: '110%', marginLeft: '-5%', marginTop: '-5%' },
          400
        );
    },
    function() {
      $(this)
        .find('img')
        .stop(true)
        .animate(
          { width: '100%', marginLeft: '0', marginTop: '0' },
          400
        );
    }
  );

  // 5) Logo pulse on hover
  $('.logo img').hover(
    function() {
      $(this).stop(true).animate({ width: '+=10px', height: '+=10px' }, 200);
    },
    function() {
      $(this).stop(true).animate({ width: '-=10px', height: '-=10px' }, 200);
    }
  );
});