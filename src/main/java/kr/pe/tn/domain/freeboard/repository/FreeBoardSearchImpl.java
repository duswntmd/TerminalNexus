package kr.pe.tn.domain.freeboard.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.JPQLQuery;
import kr.pe.tn.domain.freeboard.entity.FreeBoard;
import kr.pe.tn.domain.freeboard.entity.QFreeBoard;
import kr.pe.tn.domain.user.entity.QUserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;

import java.util.List;

public class FreeBoardSearchImpl extends QuerydslRepositorySupport implements FreeBoardSearch {

    public FreeBoardSearchImpl() {
        super(FreeBoard.class);
    }

    @Override
    public Page<FreeBoard> search(Pageable pageable, String type, String keyword) {

        QFreeBoard freeBoard = QFreeBoard.freeBoard;
        QUserEntity user = QUserEntity.userEntity;

        JPQLQuery<FreeBoard> query = from(freeBoard);
        query.leftJoin(freeBoard.user, user).fetchJoin();

        BooleanBuilder booleanBuilder = new BooleanBuilder();
        booleanBuilder.and(freeBoard.isDeleted.eq(false));

        if (type != null && keyword != null && !keyword.trim().isEmpty()) {
            BooleanBuilder conditionBuilder = new BooleanBuilder();
            String[] typeArr = type.split("");
            for (String t : typeArr) {
                switch (t) {
                    case "t":
                        conditionBuilder.or(freeBoard.title.contains(keyword));
                        break;
                    case "c":
                        conditionBuilder.or(freeBoard.content.contains(keyword));
                        break;
                    case "w":
                        conditionBuilder.or(user.nickname.contains(keyword));
                        break;
                }
            }
            booleanBuilder.and(conditionBuilder);
        }

        query.where(booleanBuilder);

        // 정렬은 Pageable에서 처리되도록 하거나 여기서 명시
        if (pageable.getSort().isSorted()) {
            java.util.Objects.requireNonNull(super.getQuerydsl()).applySorting(pageable.getSort(), query);
        } else {
            query.orderBy(freeBoard.id.desc());
        }

        List<FreeBoard> list = java.util.Objects.requireNonNull(super.getQuerydsl()).applyPagination(pageable, query)
                .fetch();
        long count = query.fetchCount();

        return new PageImpl<>(list, pageable, count);
    }
}
