// Step 4: Hamburger Menu Module
// Handles slide-out menu functionality for task configuration

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Hamburger menu module loaded');

        // Get menu elements
        const menuToggle = document.getElementById('menu-toggle');
        const slideMenu = document.getElementById('slide-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        const menuClose = document.getElementById('menu-close');

        // Debug: Check if elements are found
        console.log('Menu elements found:', {
            menuToggle: !!menuToggle,
            slideMenu: !!slideMenu,
            menuOverlay: !!menuOverlay,
            menuClose: !!menuClose
        });

        // Menu functions
        function openMenu() {
            console.log('Opening menu...');
            if (slideMenu && menuOverlay && menuToggle) {
                slideMenu.classList.add('open');
                menuOverlay.classList.add('active');
                menuToggle.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeMenu() {
            console.log('Closing menu...');
            if (slideMenu && menuOverlay && menuToggle) {
                slideMenu.classList.remove('open');
                menuOverlay.classList.remove('active');
                menuToggle.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }

        // Event listeners
        if (menuToggle) {
            console.log('Adding click listener to menu toggle');
            menuToggle.addEventListener('click', function(e) {
                console.log('Menu toggle clicked');
                e.preventDefault();
                e.stopPropagation();
                openMenu();
            });
        } else {
            console.error('ERROR: menuToggle element not found');
        }

        if (menuClose) {
            menuClose.addEventListener('click', function(e) {
                console.log('Menu close clicked');
                e.preventDefault();
                closeMenu();
            });
        }

        if (menuOverlay) {
            menuOverlay.addEventListener('click', function(e) {
                console.log('Menu overlay clicked');
                closeMenu();
            });
        }

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && slideMenu && slideMenu.classList.contains('open')) {
                closeMenu();
            }
        });

        // Expose functions globally for testing/debugging
        window.hamburgerMenu = {
            open: openMenu,
            close: closeMenu,
            toggle: function() {
                if (slideMenu && slideMenu.classList.contains('open')) {
                    closeMenu();
                } else {
                    openMenu();
                }
            }
        };

        console.log('Hamburger menu module initialized');
    });

})();
