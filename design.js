$(document).ready(function () {
    const navbars = $('#logo, .navbar1, #main-navbar, #shape-navbar, #text-annotation-navbar');

    // Keep elements fixed at the top, ensuring visibility
    navbars.css({
        position: 'fixed',
        width: '100%',
        left: 0,
        zIndex: 100, // Keep above other content
        background: function () {
            return $(this).css('background-color') || '#fff'; // Ensure background color remains
        },
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // Subtle shadow effect
    });

    // Function to update positions dynamically
    function updatePositions() {
        let offset = 0;

        $('#logo').css({ top: offset + 'px' });
        offset += $('#logo').outerHeight();

        $('.navbar1').css({ top: offset + 'px' });
        offset += $('.navbar1').outerHeight();

        // Check which navbar is visible and position it correctly
        if ($('#shape-navbar').is(':visible')) {
            $('#shape-navbar').css({ top: offset + 'px' });
        } else if ($('#text-annotation-navbar').is(':visible')) {
            $('#text-annotation-navbar').css({ top: offset + 'px' });
        } else {
            $('#main-navbar').css({ top: offset + 'px' });
        }

        // Prevent content from being hidden under fixed navbars
        $('body').css('padding-top', offset + 'px');
    }

    // Ensure the main navbar is visible on page load
    $('#main-navbar').show();
    $('#shape-navbar, #text-annotation-navbar').hide();
    updatePositions();

    // Function to toggle the Shape Navbar
    window.toggleShapeNavbar = function () {
        $('#shape-navbar').show();
        $('#main-navbar, #text-annotation-navbar').hide();
        updatePositions();
    };

    // Function to toggle the Text Annotation Navbar
    window.toggleTextAnnotationNavbar = function () {
        $('#text-annotation-navbar').show();
        $('#main-navbar, #shape-navbar').hide();
        updatePositions();
    };

    // Function to toggle the Main Navbar (Fill & Sign)
    window.toggleMainNavbar = function () {
        $('#main-navbar').show();
        $('#shape-navbar, #text-annotation-navbar').hide();
        updatePositions();
    };

    // Scroll event to maintain styles dynamically
    $(window).scroll(function () {
        if ($(window).scrollTop() > 0) {
            navbars.css({ boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }); // Add shadow when scrolling
        } else {
            navbars.css({ boxShadow: 'none' }); // Remove shadow when at the top
        }
    });
});
