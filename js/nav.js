
// Wait for the document to be ready
$(document).ready(function() {
    $('.nav__toggle-btn').click(function () {
        $(this).toggleClass('active');
        console.log("Clicked menu button");
        $(".nav__wrapper").toggleClass("nav__wrapper--visible");
    });

    let lastScrollTop = 0; 
    let navbar = document.querySelector('.nav'); 

    if (navbar) {
        window.addEventListener('scroll', () => { 
            const currentScroll = window.scrollY || document.documentElement.scrollTop; 
        
            if (currentScroll > lastScrollTop && !$('.nav__toggle-btn').hasClass('active')) { 
                // Scrolling down 
                navbar.style.top = '-50vh'; // Hide navbar with smooth transition 
            } else { 
                // Scrolling up 
                navbar.style.top = '0'; // Show navbar 
            }
            lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // For Mobile or negative scrolling 
        }); 
    }
});

