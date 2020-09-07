module.exports = function(grunt){
    var compId = grunt.option('compid') || 'cqs';
    var sPwd = grunt.option('pwd');
    var sUser = grunt.option('user');

    grunt.log.writeln(compId);

    //Load plugin
    grunt.loadNpmTasks('grunt-sapui5');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-nwabap-ui5uploader');

    //Project config
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%=pkg.description %> <%=pkg.version %> <%= grunt.template.today("yyyy-mm-dd")%> */\n'
            },
            build: {
                src: 'webapp/Component.js',
                dest: 'build/'+compId+'/Component.min.js'
            }
        },
        clean: {
            content: ['build/'+compId+'/']
        },        
        'string-replace': {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'dist/',
                    src: '**/*',
                    dest: 'build/'+compId+'/'
                }],
                options: {
                    replacements: [{
                        pattern: /vl\.ism\.akv\.cdv/g,
                        replacement: 'vl.ism.akv.' + compId
                    },
                    {
                        pattern: /vl\/ism\/akv\/cdv/g,
                        replacement: 'vl/ism/akv/' + compId
                    },{
                        pattern: 'ZAKV_SRV;o=CDV',
                        replacement: 'ZAKV_SRV;o=' + compId.toUpperCase()
                    }]
                }
            }  
        },
        copy: {           
            binary: {
                expand: true,
                cwd: 'webapp/',
                src: 'src/**',
                dest: 'build/' + compId + '/'
            },
            replace: {
                expand: true,
                cwd: 'dist/',
                src: [ '**/*', '!src/' ],
                dest: 'build/' + compId + '/',
                options: {
                    process: function (content, srcpath) {
                        content = content.replace(/vl\.ism\.akv\.cdv/g, "vl.ism.akv."+compId);
                        content = content.replace(/vl\/ism\/akv\/cdv/g, "vl/ism/akv/"+compId);
                        content = content.replace(/ZAKV_SRV;o=CDV/g, "ZAKV_SRV;o="+compId.toUpperCase());
                        return content;
                    },
                },
            }
        },
        nwabap_ui5uploader: {
            options: {
                conn: {
                    server: 'https://sapgw.styria-it.hr:8002/',
                },
                resources: {
                    cwd: 'build/'+ compId
                },                
                auth: {
                    user: sUser,
                    pwd: sPwd
                }
            },
            upload_build: {
                options: {
                    ui5: {
                        package: 'ZAKV',
                        bspcontainer: 'ZAKV_' + compId.toUpperCase(),
                        bspcontainer_text: 'Acquisiter ' + compId.toUpperCase(),
                        transportno: 'AKVK900011'
                    },
                    resources: {
                        cwd: 'build/'+ compId,
                        src: '**/*.*'
                    }
                }
            }
        }              
    });


    //Default task(s)
    //grunt.registerTask('default', ['uglify']);
    //grunt.registerTask('default', ['replace']);
    grunt.registerTask('prepare', ['copy']);
    grunt.registerTask('deploy', ['nwabap_ui5uploader']);
}