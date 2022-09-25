const config = {
  modules: [
    {
      name: 'core',
      desc: 'Core Adapter Beschreibung',
      controllers: [ {
        name: 'Firmware',
        commands: [ {
          name: 'info',
          desc: '',
          url: '/core/firmware/info',
          method: 'GET',
          refresh: 60,
          ignore: [ 'propertyName' ],
          transform: (data) => {
            data.package = (data.package || []).length
            data.plugin = (data.plugin || []).length
            data.changelog = (data.changelog || []).length
            return data
          }
        }, {
          name: 'status',
          url: null,
          method: 'GET',
          refresh: 3600,
          ignore: [ 'all_packages', 'all_sets', 'upgrade_sets' ],
          transform: (data) => {
            data.new_packages = (data.new_packages || []).length
            data.reinstall_packages = (data.reinstall_packages || []).length
            data.remove_packages = (data.remove_packages || []).length
            data.downgrade_packages = (data.downgrade_packages || []).length
            data.upgrade_packages = (data.upgrade_packages || []).length
            return data
          }
        } ]
      } ]
    }
  ]
}

module.exports = config;
