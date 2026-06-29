# mutation-stamp: sha256=348a9b94ed628e654998d7967d3b5182345f06231500217c9d4e683422d614f2
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-06-29T06:32:20.046693Z","feature_name":"Greeting","feature_path":"features/greeting.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"sha256:53dc0614cbd976656894c6e4620be1119e454d15f822dba4bd18df0d9d5e6f1a","scenarios":[{"index":0,"name":"the core builds a greeting for a target","scenario_hash":"d52b58db85ddf5dbc594feeea342f79d9d0d61a3282e32930702bcf94a6293d0","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-06-29T06:30:55.875478Z"}]}
# acceptance-mutation-manifest-end

Feature: Greeting

  Scenario Outline: the core builds a greeting for a target
    Given the greeting target is <target>
    Then the greeting is <message>

    Examples:
      | target | message      |
      | world  | hello world  |
      | pillow | hello pillow |
