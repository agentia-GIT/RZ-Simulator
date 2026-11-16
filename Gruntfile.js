module.exports = function(grunt){

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                // mangle ne renomme que les variables locales : les fonctions globales appelées
                // depuis des attributs onclick="..." gardent donc leur nom.
                mangle: true
            },
            my_target: {
                files: {
                    'dist/networksim.min.js': [
                        // Ordre explicite : Globals et UITranslation d'abord (les fichiers i18n s'y
                        // enregistrent au chargement), puis le reste, puis les langues.
                        'js/Globals.js',
                        'js/UITranslation.js',
                        'js/!(Globals|UITranslation|simulator).js',
                        'js/i18n/*.js',
                        'js/simulator.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify']);

};
