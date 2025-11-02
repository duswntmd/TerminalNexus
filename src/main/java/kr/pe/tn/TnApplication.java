package kr.pe.tn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TnApplication {

    public static void main(String[] args) {
        SpringApplication.run(TnApplication.class, args);
    }

}
